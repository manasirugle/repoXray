import re
cf_path = r'c:\Users\GUEST 1\Desktop\RepoxRay\repoXray\frontend\src\components\CoverflowCarousel.tsx'
with open(cf_path, 'r', encoding='utf-8') as f:
    cf_content = f.read()

cf_content = cf_content.replace('"theme-blue"', '"theme-indigo"')

with open(cf_path, 'w', encoding='utf-8') as f:
    f.write(cf_content)

print('Updated CoverflowCarousel.tsx')
