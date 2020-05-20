function getCallbackHtml() {
  return `
<html>
<head>
</head>
<body>
  <h1>Redirecting...</h1>
  <div class="debug"></div>
  <script>
  try {

    const debugElement = document.querySelector('.debug');

    const keyPairs = window.location.hash.substr(1)
      .split('&')
      .map(keyPair => keyPair.split('='));



    const accessToken = keyPairs.find(keyPair => keyPair[0] === 'access_token')[1];

    debugElement.innerText = JSON.stringify(accessToken);

    if(accessToken) {
      window.opener.postMessage(accessToken, '*')
      window.close();
    }
  } catch(e) {
    document.write(JSON.stringify(e));
  }
  </script>
</body>
</html>

  `;
}

module.exports = getCallbackHtml;
