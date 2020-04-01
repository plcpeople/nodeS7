//@ts-check

const S7Endpoint = require('./src/s7endpoint');
const S7ItemGroup = require('./src/s7itemGroup');

class NodeS7 {

    constructor(opts) {
        this._ep = null;
        this._group = null;
        this._translationCb = null;
    }

    initiateConnection(param, cb) {
        this._ep = new S7Endpoint(param);
        this._group = new S7ItemGroup(this._ep);

        if(this._translationCb){
            this._group.setTranslationCB(this._translationCb);
        }

        let cbDone = false;
        const doCb = (err) => {
            if (cbDone || typeof cb !== 'function') return;
            cbDone = true;
            if (err) {
                this._ep.disconnect().then(() => cb(err)).catch(cb);
            } else {
                cb(err);
            }
        }
        this._ep.once('connect', doCb);
        this._ep.on('error', doCb);
    }

    dropConnection(cb) {
        if(!this._ep) {
            if (typeof cb === 'function'){
                process.nextTick(() => cb());
            }
            return;
        }

        this._ep.disconnect().then(cb).catch(cb);
        this._ep = null;
        this._group = null;
    }

    setTranslationCB(cb) {
        this._translationCb = cb;
        if (this._group) {
            this._group.setTranslationCB(cb);
        }
    }

    addItems(item) {
        this._group.addItems(item);
    }

    removeItems(item) {
        this._group.removeItems(item);
    }
    
    readAllItems(cb) {
        if (!this._group) {
            process.nextTick(() => cb(true, {}));
            return;
        }

        this._group.readAllItems().then(data => {
            cb(false, data);
        }).catch(e => {
            cb(e, {});
        });
    }

    writeItems(item, value, cb) {
        if (!this._group) {
            process.nextTick(() => cb(true, {}));
            return;
        }

        this._group.writeItems(item, value).then(data => {
            cb(false, data);
        }).catch(e => {
            cb(e, {});
        });

    }

}

module.exports = NodeS7;