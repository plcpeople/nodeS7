const nodes7 = require('../../src');

let plc = new nodes7.S7Endpoint({ host: '192.168.15.211', slot: 1 });

plc.on('connect', () => console.log('PLC#connect'));
plc.on('error', e => console.log('PLC#error', e));
plc.on('disconnect', () => console.log('PLC#disconnect'));

function print(promise){
    promise.then(data => console.log('** RESULT', data)).catch(e => console.log('** ERROR', e));
}

let timer;
plc.once('connect', () => {
    timer = setInterval(() => {
        print(plc.readInputs(0, 1));
    }, 1000)
});

//clean disconnect
process.on('SIGINT', () => {
    clearInterval(timer);
    plc.disconnect();
})