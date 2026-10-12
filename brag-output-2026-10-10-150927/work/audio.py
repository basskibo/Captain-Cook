import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile
SR=48000; DUR=21.0; N=int(SR*DUR)
rng=np.random.default_rng(7)
mus=np.zeros((N,2)); sfx=np.zeros((N,2))
def hz(m): return 440*2**((m-69)/12)
def add(buf,t,sig,gain=1.0,pan=0.0):
    i=int(t*SR); j=min(N,i+len(sig))
    if j<=i: return
    l=np.sqrt(.5*(1-pan)); r=np.sqrt(.5*(1+pan))
    buf[i:j,0]+=sig[:j-i]*gain*l; buf[i:j,1]+=sig[:j-i]*gain*r
def tt(d): return np.arange(int(d*SR))/SR
def marimba(m,d=1.2,bright=1.0):
    t=tt(d); f=hz(m)
    s=np.sin(2*np.pi*f*t)*np.exp(-t*4.5)+0.25*bright*np.sin(2*np.pi*f*3.93*t)*np.exp(-t*18)+0.06*bright*np.sin(2*np.pi*f*9.2*t)*np.exp(-t*40)
    a=np.minimum(1,t/0.003); return s*a
def pluck(m,d=0.5):
    t=tt(d); f=hz(m)
    s=np.sin(2*np.pi*f*t)+0.3*np.sin(2*np.pi*2*f*t)*np.exp(-t*8)+0.12*np.sin(2*np.pi*3*f*t)*np.exp(-t*14)
    return s*np.exp(-t*5)*np.minimum(1,t/0.004)
def kick():
    t=tt(0.35); ph=2*np.pi*np.cumsum(50+80*np.exp(-t*30))/SR
    return np.sin(ph)*np.exp(-t*9)
def shaker(d=0.06):
    n=rng.standard_normal(int(d*SR)); sos=butter(2,6000,'hp',fs=SR,output='sos')
    t=tt(d); return sosfilt(sos,n)*np.exp(-t*60)*np.minimum(1,t/0.004)
def pad(ms,d,att=0.6,rel=1.0):
    t=tt(d); s=np.zeros_like(t)
    for m in ms:
        for det in (-0.06,0.06): s+=np.sin(2*np.pi*hz(m+det)*t)+0.15*np.sin(2*np.pi*hz(m+det)*2*t)
    env=np.minimum(1,t/att)*np.minimum(1,(d-t)/rel); return s*env/len(ms)/2
def bell(m,d=1.6):
    t=tt(d); f=hz(m)
    s=np.sin(2*np.pi*f*t)*np.exp(-t*3)+0.4*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*6)+0.2*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*10)
    return s*np.minimum(1,t/0.002)
BPM=112; B=60/BPM; G0=2.45  # groove start
END=18.25
C=[48,52,55,60]; Am=[45,52,57,60]; F=[41,48,53,57]; Gc=[43,50,55,59]
prog=[C,Am,F,Gc]
# hook: soft pad swell + emoji notes + title hit
add(mus,0.0,pad([60,64,67],2.7,att=0.8,rel=0.5),0.10)
for n,m in enumerate([72,76,79,81,84]): add(sfx,0.08+n*0.17+0.05,marimba(m,1.0),0.16,pan=-0.4+0.2*n)
add(mus,1.0,kick(),0.32); add(mus,1.0,pluck(36,0.9),0.22); add(mus,1.0,marimba(60,1.4,0.6),0.12); add(mus,1.0,marimba(67,1.4,0.6),0.1)
# groove
beat=0; t=G0
motif=[72,None,76,79,None,76,74,None]  # 8ths per bar pattern start, transposed per chord
while t<END-0.01:
    bar=beat//4; ch=prog[bar%4]; b=beat%4
    if b==0: add(mus,t,pad([m+12 for m in ch[1:]],4*B+0.6,att=0.3,rel=0.5),0.07)
    add(mus,t,kick(),0.30 if b in (0,2) else 0.0)
    add(mus,t,pluck(ch[0]-12+(7 if b==3 else 0),0.45),0.20)
    for h in range(2):
        th=t+h*B/2
        if th<END: add(mus,th,shaker(),0.05*(1.4 if h else 0.8),pan=0.3)
        m=motif[(b*2+h)%8]
        if m is not None and th<END:
            root=ch[0]%12; m2=m+ (root if root<6 else root-12)
            # snap to C major scale
            sc=[0,2,4,5,7,9,11]
            while m2%12 not in sc: m2-=1
            add(mus,th,marimba(m2,0.8,0.7),0.07,pan=0.25)
    beat+=1; t=G0+beat*B
# outro chord
add(mus,END,kick(),0.3); add(mus,END,pluck(36,2.7),0.25); add(mus,END,pluck(48,2.7),0.1)
add(mus,END,pad([60,64,67,72],DUR-END,att=0.05,rel=1.4),0.2)
for n,m in enumerate([60,64,67,72,76]): add(sfx,END+n*0.06,marimba(m,2.2),0.11,pan=-0.3+0.15*n)
# taps
taps=[3.024,3.60,4.16,5.626,6.172,7.241,8.431,12.655,14.638]
notes=[79,81,84,79,81,84,86,84,79]
for tp,m in zip(taps,notes): add(sfx,tp,marimba(m,0.6,0.5),0.09,pan=0.35)
# pan sizzle 8.6-10.0
d=1.6; n=rng.standard_normal(int(d*SR)); sos=butter(2,[2500,9000],'bp',fs=SR,output='sos')
tz=tt(d); env=np.minimum(1,tz/0.4)*np.minimum(1,(d-tz)/0.5)*(0.7+0.3*np.abs(np.sin(tz*9)))
add(sfx,8.55,sosfilt(sos,n)*env,0.035,pan=0.3)
# results land
for n,m in enumerate([76,79,84]): add(sfx,10.0+n*0.11,marimba(m,0.8),0.08,pan=0.35)
# timer bell
add(sfx,16.21,bell(79),0.06,pan=0.3); add(sfx,16.36,bell(84),0.06,pan=0.3)
# space: shared reverb
ir_t=tt(1.6); ir=rng.standard_normal((len(ir_t),2))*np.exp(-ir_t*3.2)[:,None]
sos=butter(1,5000,'lp',fs=SR,output='sos'); ir=sosfilt(sos,ir,axis=0); ir/=np.sqrt((ir**2).sum(0))
def verb(x,wet):
    w=np.stack([fftconvolve(x[:,c],ir[:,c])[:N] for c in range(2)],1); return x+wet*w
mix=verb(mus,0.18)+verb(sfx,0.28)
# gentle bus: lowpass shelf-ish + soft clip
mix=sosfilt(butter(1,12000,'lp',fs=SR,output='sos'),mix,axis=0)
mix=np.tanh(mix*1.2)/1.2
fade=np.ones(N); fl=int(1.0*SR); fade[-fl:]=np.linspace(1,0,fl)**1.5; fade[:int(.005*SR)]=np.linspace(0,1,int(.005*SR))
mix*=fade[:,None]
peak=np.abs(mix).max(); mix=mix/peak*0.89
wavfile.write('audio.wav',SR,(mix*32767).astype(np.int16))
print('peak',peak,'rms dB',20*np.log10(np.sqrt((mix**2).mean())))
