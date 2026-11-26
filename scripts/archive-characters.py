#!/usr/bin/env python3
"""Archive character portraits from the public catalog, keeping source URLs."""
import hashlib, io, json, pathlib, time, urllib.parse, urllib.request
from PIL import Image, ImageOps
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'src/data'
DEST=ROOT/'public/media/characters'
REPORT=DATA/'character-archive.json'
MAX=20*1024*1024
Image.MAX_IMAGE_PIXELS=40_000_000
def allowed(url):
    u=urllib.parse.urlparse(url)
    return u.scheme=='https' and u.netloc=='storage.googleapis.com' and u.path.startswith('/glide-prod.appspot.com/uploads-v2/') and '/pub/' in u.path
class Redirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not allowed(newurl): raise ValueError('Unexpected redirect')
        return super().redirect_request(req, fp, code, msg, headers, newurl)
def archive(url,old):
    if not allowed(url): raise ValueError('Unexpected source URL')
    path=DEST/(hashlib.sha256(url.encode()).hexdigest()[:20]+'.webp')
    if path.is_file() and old.get('sha256')==hashlib.sha256(path.read_bytes()).hexdigest(): return old
    for i in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'MasljanicaPortraitArchive/1.0'})
            with urllib.request.build_opener(Redirect()).open(req,timeout=45) as r:
                if not allowed(r.geturl()): raise ValueError('Unexpected final URL')
                data=r.read(MAX+1)
                if len(data)>MAX: raise ValueError('Image too large')
            with Image.open(io.BytesIO(data)) as src:
                im=ImageOps.exif_transpose(src).convert('RGBA' if 'A' in src.getbands() or 'transparency' in src.info else 'RGB')
                im.thumbnail((640,640),Image.Resampling.LANCZOS)
                buf=io.BytesIO();im.save(buf,'WEBP',quality=84,method=6)
                raw=buf.getvalue()
                with Image.open(io.BytesIO(raw)) as check:
                    check.load()
                    if check.format!='WEBP': raise ValueError('Invalid WebP')
                tmp=path.with_suffix('.tmp');tmp.write_bytes(raw);tmp.replace(path)
                return {'path':'/media/characters/'+path.name,'width':im.width,'height':im.height,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
        except Exception:
            if i==2: raise
            time.sleep(2**i)
def main():
    DEST.mkdir(parents=True,exist_ok=True)
    old=json.loads(REPORT.read_text('utf8')).get('files',{}) if REPORT.exists() else {}
    urls=sorted({x['image'] for x in json.loads((DATA/'characters.json').read_text('utf8')) if x.get('image')})
    files,errors={},{}
    for url in urls:
        try: files[url]=archive(url,old.get(url,{})); print('OK',url,files[url]['bytes'],flush=True)
        except Exception as e: errors[url]=str(e); print('FAILED',url,e,flush=True)
    REPORT.write_text(json.dumps({'files':files,'errors':errors,'total':len(urls),'archived':len(files),'bytes':sum(x['bytes'] for x in files.values())},ensure_ascii=False,indent=2)+'\n','utf8')
if __name__=='__main__': main()
