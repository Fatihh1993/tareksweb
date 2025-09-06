export async function GET() {
  const html = `<!doctype html>
  <html lang="tr">
    <head>
      <meta charset="utf-8" />
      <title>e-Devlet callback</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <meta name="color-scheme" content="light dark" />
      <style>
        body {
          font-family: system-ui, sans-serif;
          margin: 0;
          padding: 2rem;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <p id="message">İşlem tamamlanıyor...</p>
      <script>
        (function(){
          try {
            var q = location.search || '';
            if (window.opener && !window.opener.closed) {
              window.opener.postMessage({ type: 'edv_callback', query: q }, window.origin);
              try { window.close(); } catch (e) {}
              document.getElementById('message').textContent = 'Giriş tamamlandı. Pencere kapanıyor...';
            } else {
              document.getElementById('message').textContent = 'Pencere sahibi bulunamadı. Bu sekmeyi kapatıp uygulamaya dönün.';
            }
          } catch (err) {
            document.getElementById('message').textContent = 'Callback sırasında hata oluştu.';
          }
        })();
      </script>
    </body>
  </html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
