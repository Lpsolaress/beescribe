import sys
import os
print("CWDIR:", os.getcwd())
print("SYS.PATH:", sys.path)
print("DIR LIST:", os.listdir('.'))

sys.path.append(os.getcwd())
try:
    import api.main
    print("Import successful!")
except Exception as e:
    import traceback
    traceback.print_exc()
