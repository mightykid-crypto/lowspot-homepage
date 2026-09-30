import ctypes, subprocess, time, os
from ctypes import wintypes
from PIL import Image
u32=ctypes.windll.user32; g32=ctypes.windll.gdi32
ctypes.windll.shcore.SetProcessDpiAwareness(2)

class BITMAPINFOHEADER(ctypes.Structure):
    _fields_=[("biSize",wintypes.DWORD),("biWidth",ctypes.c_long),("biHeight",ctypes.c_long),
      ("biPlanes",wintypes.WORD),("biBitCount",wintypes.WORD),("biCompression",wintypes.DWORD),
      ("biSizeImage",wintypes.DWORD),("biXPelsPerMeter",ctypes.c_long),("biYPelsPerMeter",ctypes.c_long),
      ("biClrUsed",wintypes.DWORD),("biClrImportant",wintypes.DWORD)]
class BITMAPINFO(ctypes.Structure):
    _fields_=[("bmiHeader",BITMAPINFOHEADER),("bmiColors",wintypes.DWORD*3)]

def grab_window(hw):
    r=wintypes.RECT(); u32.GetWindowRect(hw,ctypes.byref(r))
    w,h=r.right-r.left, r.bottom-r.top
    hdc=u32.GetWindowDC(hw); mdc=g32.CreateCompatibleDC(hdc)
    bmp=g32.CreateCompatibleBitmap(hdc,w,h); g32.SelectObject(mdc,bmp)
    ok=u32.PrintWindow(hw,mdc,2)          # 2 = PW_RENDERFULLCONTENT
    bi=BITMAPINFO(); bi.bmiHeader.biSize=ctypes.sizeof(BITMAPINFOHEADER)
    bi.bmiHeader.biWidth=w; bi.bmiHeader.biHeight=-h
    bi.bmiHeader.biPlanes=1; bi.bmiHeader.biBitCount=32; bi.bmiHeader.biCompression=0
    buf=ctypes.create_string_buffer(w*h*4)
    g32.GetDIBits(mdc,bmp,0,h,buf,ctypes.byref(bi),0)
    g32.DeleteObject(bmp); g32.DeleteDC(mdc); u32.ReleaseDC(hw,hdc)
    return Image.frombuffer('RGB',(w,h),buf,'raw','BGRX',0,1), ok

def windows_of(pid):
    out=[]
    @ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    def cb(h,l):
        p=wintypes.DWORD(); u32.GetWindowThreadProcessId(h,ctypes.byref(p))
        if p.value==pid and u32.IsWindowVisible(h):
            r=wintypes.RECT(); u32.GetWindowRect(h,ctypes.byref(r))
            if r.right-r.left>200 and r.bottom-r.top>200: out.append(h)
        return True
    u32.EnumWindows(cb,0); return out

OUT=r'C:\오레브사용자\프로젝트\홈페이지\화면사진'
apps=[('성경노트',r'C:\Users\might\AppData\Local\Programs\bible-study-note\성경 연구 노트.exe'),
      ('교회재정',r'C:\오레브사용자\프로젝트\앱\church-finance\src-tauri\target\release\church-finance.exe'),
      ('QR메이커',r'C:\오레브사용자\프로젝트\앱\qr-maker\src-tauri\target\release\qr-maker.exe'),
      ('PDF변환', r'C:\오레브사용자\프로젝트\_보관\_설치본_백업\pdf-converter-pro_portable.exe'),
      ('찬양콘티',r'C:\오레브사용자\프로젝트\_보관\_설치본_백업\praisegenapp_portable.exe')]
for name,path in apps:
    if not os.path.exists(path): print(f'{name} : 실행파일 없음',flush=True); continue
    p=subprocess.Popen([path],cwd=os.path.dirname(path)); hw=None
    for _ in range(16):
        time.sleep(0.8)
        ws=windows_of(p.pid)
        if ws: hw=ws[0]; break
    if not hw: p.kill(); print(f'{name} : 창이 안 뜸',flush=True); continue
    best=None
    for _ in range(5):
        time.sleep(2.5)
        img,ok=grab_window(hw)
        c=img.getcolors(maxcolors=8192); n=len(c) if c else 8192
        if best is None or n>best[1]: best=(img,n,ok)
        if n>60: break
    img,n,ok=best
    f=os.path.join(OUT,f'{name}_1_첫화면.png'); img.save(f)
    print(f'{name} : {img.width}x{img.height} 색 {n}종 PrintWindow={ok} → {os.path.getsize(f)//1024}KB',flush=True)
    p.terminate()
    try: p.wait(timeout=3)
    except Exception: p.kill()
