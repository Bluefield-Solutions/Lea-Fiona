# Erzeugt das App-Icon mit den ECHTEN Spielfiguren (Lea & Fiona) im Spiel-Look.
# Ausgabe: brand-icons/{apple-touch-icon.png(180), icon-192, icon-512, icon-maskable-512}
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, math, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # Projekt-Root
W = 1024
OUT = 'brand-icons'; os.makedirs(OUT, exist_ok=True)
def lerp(a,b,t): return tuple(int(a[i]+(b[i]-a[i])*t) for i in range(3))

def sky():
    top=(142,201,255); mid=(201,167,255); bot=(255,194,221)
    arr=np.zeros((W,W,3),np.uint8)
    for y in range(W):
        t=y/(W-1); c=lerp(top,mid,t/0.55) if t<0.55 else lerp(mid,bot,(t-0.55)/0.45)
        arr[y,:]=c
    img=Image.fromarray(arr,'RGB').convert('RGBA')
    glow=Image.new('L',(W,W),0); gd=ImageDraw.Draw(glow)
    gx,gy=int(W*0.30),int(W*0.19)
    for r,a in [(int(W*0.5),85),(int(W*0.32),70),(int(W*0.18),80)]:
        gd.ellipse([gx-r,gy-r,gx+r,gy+r],fill=a)
    glow=glow.filter(ImageFilter.GaussianBlur(60))
    white=Image.new('RGBA',(W,W),(255,255,255,255)); white.putalpha(glow)
    return Image.alpha_composite(img,white)

def hills(img):
    d=ImageDraw.Draw(img,'RGBA')
    def hill(base,amp,col,ph):
        pts=[(0,W)]
        for x in range(0,W+1,8):
            y=base+math.sin(x/W*math.pi*2+ph)*amp+math.sin(x/W*math.pi*5+ph)*amp*0.4
            pts.append((x,y))
        pts.append((W,W)); d.polygon(pts,fill=col)
    hill(int(W*0.80),26,(138,208,106,255),0.4)
    hill(int(W*0.865),20,(107,189,82,255),1.2)

def star(img,cx,cy,r):
    d=ImageDraw.Draw(img,'RGBA'); rot=-0.2; pts=[]
    for i in range(10):
        ang=rot+i*math.pi/5-math.pi/2; rad=r if i%2==0 else r*0.44
        pts.append((cx+math.cos(ang)*rad,cy+math.sin(ang)*rad))
    d.polygon([(x+3,y+4) for x,y in pts],fill=(180,120,10,90))
    d.polygon(pts,fill=(255,210,63,255),outline=(224,138,16,255))

def paste(img,path,th,cx,feet):
    im=Image.open(path).convert('RGBA'); im=im.crop(im.getbbox())
    s=th/im.height; nw=int(im.width*s); im=im.resize((nw,th),Image.LANCZOS)
    sh=Image.new('RGBA',img.size,(0,0,0,0)); ImageDraw.Draw(sh).ellipse(
        [cx-nw*0.32,feet-14,cx+nw*0.32,feet+14],fill=(30,40,20,110))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(6)))
    img.alpha_composite(im,(int(cx-nw/2),int(feet-th)))

def build(mask=False):
    k = 0.82 if mask else 1.0
    img=sky(); hills(img)
    star(img,int(W*(0.73 if mask else 0.75)),int(W*0.23),int(W*0.078*k))
    d=ImageDraw.Draw(img,'RGBA')
    for fx,fy,fr in [(0.17,0.17,6),(0.5,0.12,5),(0.88,0.44,5),(0.13,0.4,4)]:
        d.ellipse([W*fx-fr,W*fy-fr,W*fx+fr,W*fy+fr],fill=(255,255,255,220))
    hy=int(W*0.84) - (int(W*0.05) if mask else 0)
    paste(img,'attached_assets/fiona_05.webp',int(W*0.54*k),int(W*0.38),hy+int(W*0.02))
    paste(img,'attached_assets/lea_n05_takeoff.webp',int(W*0.58*k),int(W*0.64),hy)
    return img.convert('RGB')

full=build(False); mk=build(True)
full.resize((180,180),Image.LANCZOS).save(f'{OUT}/apple-touch-icon.png')
full.resize((192,192),Image.LANCZOS).save(f'{OUT}/icon-192.png')
full.resize((512,512),Image.LANCZOS).save(f'{OUT}/icon-512.png')
mk.resize((512,512),Image.LANCZOS).save(f'{OUT}/icon-maskable-512.png')
full.resize((512,512),Image.LANCZOS).save(f'{OUT}/preview-512.png')
mk.resize((512,512),Image.LANCZOS).save(f'{OUT}/preview-maskable-512.png')
print('Icons erzeugt in', OUT)
