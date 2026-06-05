const net = require('net');

const checkPort = (port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
};

(async () => {
  const p3000 = await checkPort(3000);
  const p3001 = await checkPort(3001);
  console.log(`Port 3000 open: ${p3000}`);
  console.log(`Port 3001 open: ${p3001}`);
})();
