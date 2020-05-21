function getCallbackHtml() {
  return `
<html>
<head>
</head>
<body>
  <h1>Redirecting...</h1>
  <script>
  try {
    const keyPairs = window.location.hash.substr(1)
      .split('&')
      .map(keyPair => keyPair.split('='));

    const accessToken = keyPairs.find(keyPair => keyPair[0] === 'access_token')[1];

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
