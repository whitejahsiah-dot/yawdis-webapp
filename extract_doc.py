from olefile import OleFileIO
from pathlib import Path

p = Path(r'c:\Users\Lavvy\Documents\Yawdis - WebApp\Website ideas.doc')
ole = OleFileIO(p)
stream = ole.openstream('WordDocument').read()
text = stream.decode('utf-16le', errors='ignore')
Path('plan_extract.txt').write_text(text, encoding='utf-8')
print('wrote', len(text), 'characters to plan_extract.txt')
