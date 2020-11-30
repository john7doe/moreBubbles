"use strict"

const readline = require('readline');
const fs = require('fs');

// mame contains pc for complete instructions
// fpga has multiple pc for one instruction

/*
mame:                             fpga:
B73B: bit  0,a                    b73b
B73D: jp   nz,$B789               b73c
B740: bit  1,a                    b73d
B742: jp   nz,$B7C5               b740
B745: ld   hl,$F359               b741
B748: inc  (hl)                   b742
B749: ld   a,(hl)                 b745
B74A: cp   $0A                    b748
                                  b749
                                  b74a

let mame drive the comparison. if the fpa address does not match, read the next one and compare
(allow up to 4 skips, z80 instructions are 1-4 bytes)
 */

async function compareMameAndFpga (mameTraceFile, fpgaTraceFile) {
  const mameData = await readFully(mameTraceFile)
  const fpgaData = await readFully(fpgaTraceFile)

  const fixup = new Map([
    [768, [7704,924]]
    //[8092, []]
  ])

  let f = 0
  for(let m = 0; m < mameData.length; m++) {
    const mameAddr = mameData[m].slice(0,4).toLowerCase()
    let skip = 0
    do {
      const fpaAddr = fpgaData[f].match(/.+?-\s([0-9a-f]{4}).+/)[1]
      f++
      if(mameAddr === fpaAddr) {
        break;
      }
      skip++;
      if(skip > 4) {
        if(fixup.has(m)) {
          console.log(`Known diff:\n${genDiff(mameData, m - 2 , fpgaData, f-skip - 2, 4)}`)
          const fix = fixup.get(m);
          [m, f] = fix
          break;
        } else {
          throw  new Error(`Unknown diff:\n${genDiff(mameData, m - 2 , fpgaData, f-skip - 2, 4)}`)
        }
      }
    } while (true)
  }
}

function genDiff (mameData, m, fpgaData, f, count) {
  const lines = new Array()
  for(let i = 0; i < count; i++) {
    lines.push(`${m+i}: ${mameData[m+i].padEnd(20)} | ${f+i}: ${fpgaData[f+i]}`)
  }
  return lines.join('\n')
}

async function readFully (file) {
  const mame = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity
  })

  const data = new Array()

  for await (const line of mame) {
    data.push(line)
  }
  return data
}




compareMameAndFpga('intro.tr', 'ttrace').catch(e => console.error(e))
