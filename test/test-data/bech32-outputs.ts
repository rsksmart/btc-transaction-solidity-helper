// we don't differentiate between P2WPKH, P2WSH and P2TR yet since any of the bech32 addresses are
// supported right now, when we introduce its support to the library, this test data will be divided
// into three different files.
const testnetOutputs: TestingOutput[] = [
    {
        script: '0x5120077b0a1b7ea3664a1e15a28b52e0bdb500da46174dbf3a95f2e56645753057db',
        address: 'tb1pqaas5xm75dny58s452949c9ak5qd53shfkln490ju4ny2afs2ldsput844'
    },
    {
        script: '0x001452b1b883a3f865144d34bbe360b6fd4adac494e0',
        address: 'tb1q22cm3qarlpj3gnf5h03kpdhaftdvf98q58dp75'
    },
    {
        script: '0x5120552ef34227abc1eee4d1b7cad85da7014a0174d6b9c740f9e2a547525b7350d7',
        address: 'tb1p25h0xs3840q7aex3kl9dshd8q99qzaxkh8r5p70z54r4ykmn2rtsgcsj34'
    },
    {
        script: '0x0014977d48ab28e429a95a53e68c8496772e805e07c8',
        address: 'tb1qja7532egus56jkjnu6xgf9nh96q9up7gq5473m'
    },
    {
        script: '0x0014e2236fe7d11674ec416dc55dc9da46e8413ee72b',
        address: 'tb1qug3kle73ze6wcstdc4wunkjxapqnaeetprqjql'
    },
]

const mainnetOutputs: TestingOutput[] = [
    {
        script: '0x5120a37c3903c8d0db6512e2b40b0dffa05e5a3ab73603ce8c9c4b7771e5412328f9',
        address: 'bc1p5d7rjq7g6rdk2yhzks9smlaqtedr4dekq08ge8ztwac72sfr9rusxg3297'
    },
    {
        script: '0x0014173fd310e9db2c7e9550ce0f03f1e6c01d833aa9',
        address: 'bc1qzulaxy8fmvk8a92sec8s8u0xcqwcxw4fx037d8'
    },
    {
        script: '0x512021d1565737ffe25283e1e988625911f0602bf5a5221ed0dccc95dbbb93c979d9',
        address: 'bc1py8g4v4ehll399qlpaxyxykg37pszhad9yg0dphxvjhdmhy7f08vsn43s6p'
    },
    {
        script: '0x00143c0655b0b34548d3c3502e7334c3dbbaab266aac',
        address: 'bc1q8sr9tv9ng4yd8s6s9eenfs7mh24jv64vnwzl0p'
    },
    {
        script: '0x0014a052249b6b346d3f48ee03b3a8c74bda1f3a7f61',
        address: 'bc1q5pfzfxmtx3kn7j8wqwe6336tmg0n5lmpqss9kx'
    },
]
export { testnetOutputs, mainnetOutputs }