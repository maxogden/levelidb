var IDBWrapper = require("idb-wrapper")
    , extend = require("xtend")
    , getCallback = require("./utils/getCallback")
    , getOptions = require("./utils/getOptions")

    , defaultOptions = {
        encoding: 'utf8'
        , keys: true
        , values: true
    }

module.exports = idbup

function idbup(path, defaults, callback) {
    var db = extend(new Object(), {
            put: onOpen(put)
            , del: onOpen(del)
            , get: onOpen(get)
            , batch: onOpen(batch)
            , open: open
            , close: close
            , isOpen: isOpen
            , isClosed: isClosed
        })
        , idb
        , status = "new"

    if (typeof defaults === "function") {
        callback = defaults
        defaults = {}
    }

    defaults = extend({}, defaultOptions, defaults || {})


    open(callback)

    return db

    function put(key, value, options, callback) {
        callback = getCallback(options, callback)
        options = getOptions(defaults, options)
        
        idb.put({
            value: value
            , id: key
        }, function () {
            callback && callback(null)
        }, callback)
    }

    function del(key, options, callback) {
        callback = getCallback(options, callback)
        options = getOptions(defaults, options)

        idb.remove(key, function () {
            callback && callback(null)
        }, callback)
    }

    function get(key, options, callback) {
        callback = getCallback(options, callback)
        options = getOptions(defaults, options)

        idb.get(key, function (result) {
            callback && callback(null, result, key)
        }, callback)
    }

    function batch(arr, options, callback) {
        callback = getCallback(options, callback)
        options = getOptions(defaults, options)
        var _arr = arr.map(function (item) {
            var result = {}
                , key = item.key

            if (item.type === "del") {
                result.type = "remove"
            } else if (item.type === "put") {
                result.type = "put"
                result.value = {
                    value: item.value
                    , id: key
                }
            }

            result.key = key

            return result
        })

        idbBatch.call(idb, _arr, function () {
            callback && callback()
        }, callback)
    }

    function open(options, callback) {
        if (!options) callback = options
        if (status === "opening") {
            db.on("ready", callback)
        } else if (status === "opened") {
            close(_open)
        } else {
            _open()
        }

        function _open(err) {
            if (err) {
                return callback(err)
            }

            status = "opening"

            idb = new IDBWrapper(extend({
                storeName: path
            }, defaults), function () {
                status = "opened"
                callback && callback(null, db)
            })
        }
    }

    function close(callback) {
        if (status === "opened") {
            _close()
        } else if (status === "opening") {
            db.on("ready", _close)
        } else if (status === "closed") {
            callback && callback()
        } else if (status === "new") {
            var err = new Error("cannot close unopened db")
            if (callback) {
                return callback(err)
            }
        }

        function _close() {
            idb.db.close()
            idb = null
            status = "closed"
            callback && callback()
        }
    }

    function isOpen() {
        return status === "opened"
    }

    function isClosed() {
        return status === "closed"
    }

    function onReady(callback) {
        if (status === "opened") {
            callback(idb)
        } else {
            db.on("ready", callback)
        }
    }

    function onOpen(operation) {
        return function opened() {
            var args = arguments

            onReady(function () {
                operation.apply(null, args)
            })
        }
    }

    // IDBWrapper batch implementation inlined.
    // Waiting for pull request
    function idbBatch(arr, onSuccess, onError) {
      onError || (onError = function (error) {
        console.error('Could not apply batch.', error);
      });
      onSuccess = onSuccess || noop;
      var batchTransaction = this.db.transaction(
        [this.storeName] , this.consts.READ_WRITE);
      var count = arr.length;
      var called = false;

      arr.forEach(function (operation) {
        var type = operation.type;
        var key = operation.key;
        var value = operation.value;

        if (type === "remove") {
          var deleteRequest = batchTransaction
            .objectStore(this.storeName).delete(key);
          deleteRequest.onsuccess = function (event) {
            count--;
            if (count === 0 && !called) {
              called = true;
              onSuccess();
            }
          };
          deleteRequest.onerror = function (err) {
            batchTransaction.abort();
            if (!called) {
              called = true;
              onError(err);
            }
          };
        } else if (type === "put") {
          if (typeof value[this.keyPath] === 'undefined' &&
            !this.features.hasAutoIncrement
          ) {
            value[this.keyPath] = this._getUID()
          }
          var putRequest = batchTransaction
            .objectStore(this.storeName).put(value)
          putRequest.onsuccess = function (event) {
            count--;
            if (count === 0 && !called) {
              called = true;
              onSuccess();
            }
          };
          putRequest.onerror = function (err) {
            batchTransaction.abort();
            if (!called) {
              called = true;
              onError(err);
            }
          };
        }
      }, this);
    }

    function noop() {}
}
