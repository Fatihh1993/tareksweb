export async function GET(req: Request) {
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>e-Devlet callback</title>
      <meta name="viewport" content="width=device-width,initial-scale=1" />
    </head>
    <body>
      <script>
        (function(){
          try {
            var q = location.search || '';
            if (window.opener && !window.opener.closed) {
              // send the query string back to the opener (same-origin expected)
              window.opener.postMessage({ type: 'edv_callback', query: q }, window.origin);
              // try to close the popup; if blocked, leave a message
              try { window.close(); } catch (e) {}
              document.body.innerHTML = '<p>Giriş tamamlandı. Pencere kapanıyor...</p>';
            } else {
              document.body.innerHTML = '<p>Pencere sahibi bulunamadı. Bu sekmeyi kapatıp uygulamaya dönün.</p>';
            }
          } catch (err) {
            document.body.innerHTML = '<p>Callback sırasında hata oluştu.</p>';
          }
        })();
      </script>
    </body>
  </html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
