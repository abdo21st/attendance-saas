import codecs
import re

html = codecs.open(r'backup\index.html', 'r', 'utf-8').read()

css_match = re.search(r'<style>(.*?)</style>', html, re.DOTALL)
css_content = css_match.group(1) if css_match else ''

js_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
js_content = js_match.group(1) if js_match else ''

html_clean = re.sub(r'<style>.*?</style>', '<link rel="stylesheet" href="{{ url_for(\'static\', filename=\'css/style.css\') }}">', html, flags=re.DOTALL)
html_clean = re.sub(r'<script>.*?</script>', '<script src="{{ url_for(\'static\', filename=\'js/main.js\') }}"></script>', html_clean, flags=re.DOTALL)

with codecs.open(r'static\css\style.css', 'w', 'utf-8') as f:
    f.write(css_content.strip())

with codecs.open(r'static\js\main.js', 'w', 'utf-8') as f:
    f.write(js_content.strip())

with codecs.open(r'templates\index.html', 'w', 'utf-8') as f:
    f.write(html_clean.strip())
