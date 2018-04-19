const _ = require('lodash')
const config = require('./config.json')
const TelegramBot = require('node-telegram-bot-api')
const claymore = require('./claymore.js')
const ewbfmonitor = require('./ewbf.js')
const Poloniex = require('./poloniex')
const moment = require('moment')
const bittrex = require('node-bittrex-api')
const https = require('https')

Poloniex.STRICT_SSL = false

const bot = new TelegramBot(config.token, { polling: true })

var ison = []
var oldon = []
var algos = ['Ethash', 'Equihash', 'CryptoNight', 'ClayDual']
var wtmal = ['', '', '']
var suf = ['MH/s', 'H/s', 'H/s', 'MH/s']
var all

var poloniex = new Poloniex(config.poloniex.key, config.poloniex.secret)

bittrex.options({
  'apikey': config.bittrex.key,
  'apisecret': config.bittrex.secret
})

if (config.token !== 0) {
  setInterval(function () {
    var a = ewbfmonitor.getData()
    var b = claymore.getData()
    all = a.concat(b)

    var any = false
    var msgtext = '<pre>'

    if (all.length > 0) {
      for (var miner in all) {
        if (all[miner].error == null) {
          ison[miner] = true
        } else {
          ison[miner] = false
        }
      }

      for (var j in ison) {
        if (ison[j] !== oldon[j]) {
          if (ison[j]) {
            console.log(all[j].name + ' online ' + Date())
            msgtext = msgtext + all[j].name + ' is online\n'
          } else {
            msgtext = msgtext + all[j].name + ' is offline, e:' + all[j].error + '\n'
            console.log(all[j].name + ' offline ' + Date())
          }

          any = true
        }
      }

      oldon = Object.assign({}, ison)
    }

    msgtext = msgtext + '</pre>'

    if (any) {
      bot.sendMessage(config.chatid, msgtext, { parse_mode: 'HTML' })
    }
  }, config.miner_poll)
}

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, '<pre>Your chat ID is: ' + msg.chat.id + '</pre>', { parse_mode: 'HTML' })
})

bot.onText(/\/help/, (msg) => {
  var commands = '<pre>Available commands:\n/status, /detailed, /pools, /ip, /profit\nExchange commands:\n/balances, /history</pre>'

  bot.sendMessage(msg.chat.id, commands, { parse_mode: 'HTML' })
})

bot.onText(/\/ip/, (msg) => {
  var msgtext = '<pre>IP LIST\n'

  for (var f in all) {
    var rig = all[f]
    msgtext = msgtext + rig.name + ': ' + rig.host + ' ' + rig.comments + '\n'
  }

  msgtext = msgtext + '</pre>'

  bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
})

bot.onText(/\/pools/, (msg) => {
  var msgtext = '<pre>POOL LIST\n'

  for (var f in all) {
    var rig = all[f]

    msgtext = msgtext + rig.name + ': ' + rig.pools + ' ' + rig.ver + '\n'
  }

  msgtext = msgtext + '</pre>'

  bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
})

bot.onText(/\/status/, (msg) => {
  var message = '<b>Statistics</b>\n'
  var rigs = Object.assign({}, all)

  if (_.isEmpty(rigs)) {
    bot.sendMessage(msg.chat.id, 'Mining rigs are not present as yet.')

    return
  }

  for (var f in rigs) {
    var rig = rigs[f]

    message = message + '<b>' + rig.name + '</b> \n'

    if (!_.isEmpty(rigs)) {
      var primaryHashRate = (rig.hash / 1000).toFixed(2)
      var primaryHashSymbol = (rig.hash > 10000) ? 'MH/s' : 'H/s'
      var secondaryHashRate = (rig.hash2 > 0) ? (rig.hash2 / 1000).toFixed(2) : 0
      var secondaryHashSymbol = (rig.hash2 > 10000) ? 'MH/s' : 'H/s'
      var uptime = moment.unix(rig.uptime).toNow(true)

      message = message + 'Primary Hash Rate: <i>' + primaryHashRate + ' ' + primaryHashSymbol + '</i> \n'

      if (secondaryHashRate > 0) {
        message = message + 'Secondary Hash Rate: <i>' + secondaryHashRate + ' ' + secondaryHashSymbol + '</i> \n'
      }

      message = message + 'Uptime: <i>' + uptime + '</i>\n'
    } else {
      var lastSeen = moment.unix(rig.last_seen).fromNow()
      message = message + rig.error + ' Last Seen: <i>' + lastSeen + '</i>\n'
    }
  }

  bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML' })
})

bot.onText(/\/profit/, (msg) => {
  var rigs = Object.assign({}, all)
  var msgtext = '<pre>PROFIT \n'
  var power = [0, 0, 0, 0]
  var hash = [0, 0, 0, 0]
  var kwprice = config.electricity
  var e = config.currency_symbol
  var wtmpath = 'https://whattomine.com/coins.json?utf8=%E2%9C%93'
  var coinpath = 'https://api.coinmarketcap.com/v1/ticker/bitcoin/?convert=' + config.currency

  for (var f in rigs) {
    var rig = rigs[f]

    if (rig.error === null) {
      if (rig.algo === 'eth') {
        hash[0] = hash[0] + rig.hash * 1
        hash[3] = hash[3] + rig.hash2 * 1
        power[0] = power[0] + rig.power * 1
        wtmal[0] = '&eth=true&factor%5Beth_hr%5D='
      }

      if (rig.algo === 'eq') {
        hash[1] = hash[1] + rig.hash * 1
        power[1] = power[1] + rig.power * 1
        wtmal[1] = '&eq=true&factor%5Beq_hr%5D='
      }

      if (rig.algo === 'cn') {
        hash[2] = hash[2] + rig.hash * 1
        power[2] = power[2] + rig.power * 1
        wtmal[2] = '&cn=true&factor%5Bcn_hr%5D='
      }
    }
  }

  var allpower = 0

  for (var p in power) {
    allpower = allpower + power[p]
  }

  allpower = allpower / 1000
  hash[0] = hash[0] / 1000
  hash[3] = hash[3] / 1000

  for (var a in algos) {
    if (hash[a] > 0) {
      if (a === 0) {
        msgtext = msgtext + algos[a] + ': ' + hash[a].toFixed(2) + suf[a] + ', ' + power[a] + 'W, ' + (hash[a] * 1000 / power[a]).toFixed(2) + 'H/w\n' +
        'Power: d:' + (power[a] * kwprice * 24 / 1000).toFixed(2) + e + ' w:' + (power[a] * kwprice * 24 * 7 / 1000).toFixed(2) + e + ' m:' + (power[a] * kwprice * 24 * 30 / 1000).toFixed(2) + e + '\n'
      }

      if (a === 1 || a === 2) {
        msgtext = msgtext + algos[a] + ': ' + hash[a] + suf[a] + ', ' + power[a] + 'W, ' + (hash[a] / power[a]).toFixed(2) + 'H/w\n' +
        'Power: d:' + (power[a] * kwprice * 24 / 1000).toFixed(2) + e + ' w:' + (power[a] * kwprice * 24 * 7 / 1000).toFixed(2) + e + ' m:' + (power[a] * kwprice * 24 * 30 / 1000).toFixed(2) + e + '\n'
      }
    }
  }

  msgtext = msgtext + 'Total expenses for power: ' + allpower.toFixed(2) + 'kW\n'
  msgtext = msgtext + 'd:' + (allpower * kwprice * 24).toFixed(2) + e + ' w:' + (allpower * kwprice * 24 * 7).toFixed(2) + e + ' m:' + (allpower * kwprice * 24 * 30).toFixed(2) + e + '\n'

  for (var w in wtmal) {
    if (hash[w] > 0) {
      wtmpath = wtmpath + wtmal[w] + hash[w]
    }
  };

  let price = ''
  let profits = ''

  https.get(wtmpath, (res) => {
    res.on('data', (chunk) => {
      profits += chunk
    })

    res.on('end', () => {
      profits = JSON.parse(profits)

      https.get(coinpath, (res) => {
        res.on('data', (chunk) => {
          price += chunk
        })

        res.on('end', () => {
          price = JSON.parse(price)

          var ccurr = 'price_' + config.currency
          var btc = price[0][ccurr]
          var ethtext = 'Ethash:\n'
          var eqtext = 'Equihash:\n'
          var cntext = 'CryptoNight:\n'

          msgtext = msgtext + 'Revenue:\n'

          for (var key in profits['coins']) {
            var profit = profits['coins'][key]
            var pr = profit.tag

            if (pr.length < 6) pr = pr + '    '
            if (pr.length > 5) pr = pr.substr(0, 5)
            if (profit.algorithm === 'Ethash') ethtext = ethtext + pr + ' | d:' + (profit.btc_revenue24 * btc).toFixed(2) + e + ', w:' + (profit.btc_revenue24 * btc * 7).toFixed(0) + e + ', m:' + (profit.btc_revenue24 * btc * 30).toFixed(0) + e + '\n'
            if (profit.algorithm === 'Equihash') eqtext = eqtext + pr + ' | d:' + (profit.btc_revenue24 * btc).toFixed(2) + e + ', w:' + (profit.btc_revenue24 * btc * 7).toFixed(0) + e + ', m:' + (profit.btc_revenue24 * btc * 30).toFixed(0) + e + '\n'
            if (profit.algorithm === 'CryptoNight') cntext = cntext + pr + ' | d:' + (profit.btc_revenue24 * btc).toFixed(2) + e + ', w:' + (profit.btc_revenue24 * btc * 7).toFixed(0) + e + ', m:' + (profit.btc_revenue24 * btc * 30).toFixed(0) + e + '\n'
          }

          var peth = 0
          var peq = 0
          var pecn = 0
          var dayprofit = 0

          if (hash[0] > 0) {
            msgtext = msgtext + ethtext
            peth = profits.coins.Ethereum.btc_revenue24 * 1
          }

          if (hash[1] > 0) {
            msgtext = msgtext + eqtext
            peq = profits.coins.Zcash.btc_revenue24 * 1
          }

          if (hash[2] > 0) {
            msgtext = msgtext + cntext
            pecn = profits.coins.Monero.btc_revenue24 * 1
          }

          dayprofit = (pecn + peq + peth) * btc - allpower * kwprice * 24

          msgtext = msgtext + 'ZEC+ETH+XMR-Electricity:\nd:' + dayprofit.toFixed(2) + e + ', w:' + (dayprofit * 7).toFixed(2) + e + '\nm:' + (dayprofit * 30).toFixed(2) + e + ', y:' + (dayprofit * 365).toFixed(2) + e + '</pre>'

          bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
        })
      }).on('error', (err) => {
        console.log('er: ' + err.message)

        msgtext = '<pre>coinmarketcap.com err: ' + err.message + '</pre>'

        bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
      })
    })
  }).on('error', (err) => {
    console.log('er: ' + err.message)

    msgtext = '<pre>whattomine.com err: ' + err.message + '</pre>'

    bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
  })
})

bot.onText(/\/detailed/, (msg) => {
  var rigs = Object.assign({}, all)
  var msgtext = '<pre>DETAILED STATISTICS \n'

  for (var f in rigs) {
    var rig = rigs[f]

    msgtext = msgtext + rig.name

    if (rig.error == null) {
      msgtext = msgtext + ' | ' + (rig.hash / rig.power).toFixed(2) + 'H/W\n'

      for (var j in rig.gpu) {
        var gpu = rig.gpu[j]
        var currency = rig.ver.slice(-3)

        if (currency === 'EWB') {
          msgtext = msgtext + '  ' + gpu.hash + ' H/s ' + gpu.temps + 'c ' + gpu.power + 'W ' + (gpu.hash / gpu.power).toFixed(2) + 'H/W\n'
        }

        if (currency === 'ETH') {
          msgtext = msgtext + '  ' + (gpu.hash / 1000).toFixed(2) + ' MH/s ' + gpu.temps + 'c ' + gpu.fan + '%\n'
        }

        if (currency === 'ZEC' || currency === 'XMR') {
          msgtext = msgtext + '  ' + gpu.hash + ' H/s ' + gpu.temps + 'c ' + gpu.fan + '% ' + '\n'
        }
      }
    } else {
      msgtext = msgtext + ' | OFF\n'
    }
  }

  msgtext = msgtext + '</pre>'

  bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
})

bot.onText(/\/balances/, (msg) => {
  var e = config.currency_symbol
  var coinpath = 'https://api.coinmarketcap.com/v1/ticker/bitcoin/?convert=' + e
  var price = ''
  var configured = {
    bittrex: config.bittrex.key.length > 0,
    poloniex: config.poloniex.key.length > 0
  }

  if (!configured.bittrex && !configured.poloniex) {
    bot.sendMessage(msg.chat.id, 'No Bittrex or Poloniex accounts configured.')

    return
  }

  https.get(coinpath, (res) => {
    res.on('data', (chunk) => {
      price += chunk
    })

    res.on('end', () => {
      price = JSON.parse(price)

      var ccurr = 'price_' + config.currency
      var btc = price[0][ccurr]
      var msgtext

      if (configured.bittrex) {
        bittrex.getbalances(function (data, err) {
          if (err) {
            console.error(err)

            msgtext = '<pre>bittrex.com err: ' + err.message + '</pre>'

            return
          }

          var bittdata = data.result
          msgtext = '<pre> BITTREX Balances:\n'

          for (var i in bittdata) {
            msgtext = msgtext + bittdata[i].Currency + ': ' + bittdata[i].Balance.toFixed(8) + '\n'
          }

          msgtext = msgtext + '</pre>'

          bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
        })
      }

      if (configured.poloniex) {
        poloniex.returnCompleteBalances(function (err, data) {
          if (err) {
            console.error(err)

            msgtext = '<pre>poloniex.com err: ' + err.message + '</pre>'

            return
          }

          var polodata = data
          var totalvalue = 0
          msgtext = '<pre> POLONIEX Balances:\n'

          for (var key in polodata) {
            var coin = polodata[key].available * 1
            var coinbtc = polodata[key].btcValue * 1
            var name = String(key)

            if (coin > 0) {
              msgtext = msgtext + name + ': ' + coin.toFixed(8) + ', ' + (coinbtc * btc).toFixed(2) + e + '\n'
            }

            totalvalue = totalvalue + coinbtc * 1
          }

          totalvalue = totalvalue * btc
          msgtext = msgtext + 'Total:' + totalvalue.toFixed(2) + e + '</pre>'

          bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
        })
      }
    }).on('error', (err) => {
      console.log('er: ' + err.message)

      var msgtext = '<pre>coinmarketcap.com err: ' + err.message + '</pre>'

      bot.sendMessage(msg.chat.id, msgtext, { parse_mode: 'HTML' })
    })
  })
})

bot.onText(/\/history/, (msg) => {
  var timeNow = Math.floor(Date.now() / 1000)
  var timeLastWeek = timeNow - 604800
  var tLast = new Date(timeLastWeek * 1000).toISOString()
  var msgtext
  var configured = {
    bittrex: config.bittrex.key.length > 0,
    poloniex: config.poloniex.key.length > 0
  }

  if (!configured.bittrex && !configured.poloniex) {
    bot.sendMessage(msg.chat.id, 'No Bittrex or Poloniex accounts configured.')

    return
  }

  bittrex.getwithdrawalhistory({}, function (data, err) {
    if (err) {
      console.error('E: BittrexW' + err)
      return
    }

    var bittw = data.result

    bittrex.getdeposithistory({}, function (data, err) {
      if (err) {
        console.error('E: BittrexD:' + err)

        return
      }

      var bittd = data.result

      msgtext = '<pre> BITTREX WITHDRAWALS:\n'

      for (var i in bittw) {
        var time = moment(bittw[i].Opened).fromNow()

        if (bittw[i].Opened > tLast) {
          msgtext = msgtext + bittw[i].Currency + ': ' + bittw[i].Amount + '\n to:' + bittw[i].Address + '\n date:' + time + '\n'
        }
      }

      msgtext = msgtext + ' BITTREX DEPOSITS:\n'

      for (var deposit in bittd) {
        time = moment(bittd[deposit].LastUpdated).fromNow()

        if (bittd[deposit].LastUpdated > tLast) {
          msgtext = msgtext + bittd[deposit].Currency + ': ' + bittd[deposit].Amount + ', ' + time + '\n'
        }
      }

      bot.sendMessage(msg.chat.id, msgtext + '</pre>', { parse_mode: 'HTML' })
    })
  })

  poloniex.returnDepositsWithdrawals(timeLastWeek, timeNow, function (err, data) {
    if (err) {
      console.log('E: Poloniex:', err)

      return
    }

    var polo = data
    var msgtext = '<pre> POLONIEX WITHDRAWALS:\n'
    var tx
    var time

    for (var i in polo.withdrawals) {
      tx = polo.withdrawals[i]
      time = moment(tx.timestamp * 1000).fromNow()
      msgtext = msgtext + tx.currency + ': ' + tx.amount + '\n to:' + tx.address + '\n date:' + time + '\n'
    }

    msgtext = msgtext + ' POLONIEX DEPOSITS:\n'

    for (var deposit in polo.deposits) {
      tx = polo.deposits[deposit]
      time = moment(tx.timestamp * 1000).fromNow()
      msgtext = msgtext + tx.currency + ': ' + tx.amount + ', ' + time + '\n'
    }

    bot.sendMessage(msg.chat.id, msgtext + '</pre>', { parse_mode: 'HTML' })
  })
})
