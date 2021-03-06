# levelidb

A levelup interface on top of indexeddb

## Example

The exact same api as [levelup][1]

```js
var levelidb = require("levelidb")
    , toArray = require("write-stream").toArray
    , assert = require("assert")

var db = levelidb("/tmp/some/uri", {
    encoding: "json"
})

db.put("foo", { hello: "world" }, function (err) {
    if (err) {
        throw err
    }

    db.get("foo", function (err, value) {
        if (err) {
            throw err
        }

        assert.equal(value.hello, "world")

        console.log("value", value)
    })
})
```

## Batch example

```js
var ten = makeTen()

db.batch(ten, function (err) {
    if (err) {
        throw err
    }

    var stream = db.readStream({
        start: "batch:"
        , end: "batch;"
    })

    stream.pipe(toArray(function (list) {
        list.forEach(function (item, index) {
            assert.equal(item.key, ten[index].key)
            assert.equal(item.value, ten[index].value)
        })

        console.log("list", list)
    }))

    var keyStream = db.keyStream({
        start: "batch:"
        , end: "batch;"
    })

    keyStream.pipe(toArray(function (list) {
        list.forEach(function (item, index) {
            assert.equal(item, ten[index].key)
        })

        console.log("keys", list)
    }))

    var valueStream = db.valueStream({
        start: "batch:"
        , end: "batch;"
    })

    valueStream.pipe(toArray(function (list) {
        list.forEach(function (item, index) {
            assert.equal(item, ten[index].value)
        })

        console.log("values", list)
    }))
})
```

## Stream example

```js
var writable = db.writeStream()

writable.write({ key: "write:05", value: "5" })
writable.write({ key: "write:20", value: "20" })

writable.end()
writable.on("finish", function () {
    console.log("finished writing")

    var readable = db.valueStream({
        start: "write:"
        , end: "write;"
    })

    readable.pipe(toArray(function (list) {
        assert.equal(list[0], "5")
        assert.equal(list[1], "20")
        assert.equal(list.length, 2)

        console.log("values from writeStream", list)
    }))
})

function makeTen() {
    var list = []
    for (var i = 0; i < 10; i++) {
        list.push({
            type: "put"
            , key: "batch:" + i
            , value: i
        })
    }
    return list
}
```

## Installation

`npm install levelidb`

## Contributors

 - Raynos

## MIT Licenced

  [1]: https://github.com/rvagg/node-levelup#basic-usage
