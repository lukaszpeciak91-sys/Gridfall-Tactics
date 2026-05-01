window.onerror = function (msg, url, line, col, error) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.background = 'black';
  div.style.color = 'red';
  div.style.zIndex = '99999';
  div.style.padding = '10px';
  div.style.fontSize = '12px';
  div.innerText = 'ERROR: ' + msg;
  document.body.appendChild(div);
};

window.onunhandledrejection = function (e) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '50px';
  div.style.left = '0';
  div.style.background = 'black';
  div.style.color = 'yellow';
  div.style.zIndex = '99999';
  div.style.padding = '10px';
  div.style.fontSize = '12px';
  div.innerText = 'PROMISE ERROR: ' + e.reason;
  document.body.appendChild(div);
};

document.body.insertAdjacentHTML(
  'beforeend',
  '<div style="position:fixed;top:40px;left:0;background:blue;color:white;z-index:9999;padding:10px;">JS BEFORE PHASER IMPORT OK</div>'
);

import('phaser')
  .then((module) => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div style="position:fixed;top:80px;left:0;background:green;color:white;z-index:9999;padding:10px;">PHASER IMPORT OK</div>'
    );

    const Phaser = module.default;

    const config = {
      type: Phaser.AUTO,
      width: 300,
      height: 200,
      parent: document.body,
      scene: {
        create() {
          this.add.text(50, 80, 'PHASER OK', {
            color: '#00ff00',
            fontSize: '20px'
          });
        }
      }
    };

    new Phaser.Game(config);
  })
  .catch((err) => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<pre style="position:fixed;top:80px;left:0;background:black;color:red;z-index:9999;white-space:pre-wrap;padding:10px;">PHASER IMPORT ERROR: ' +
        err +
        '</pre>'
    );
  });
