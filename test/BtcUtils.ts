import { expect } from "chai";
import { ethers } from "hardhat";
import { BtcUtils as BtcUtilsLib } from "../typechain-types";
import { bech32, bech32m } from "bech32";
import * as bs58check from "bs58check";
import * as p2kph from "./test-data/p2pkh-outputs";
import * as p2sh from "./test-data/p2sh-outputs";
import * as p2wpkh from "./test-data/p2wpkh-outputs";
import * as p2wsh from "./test-data/p2wsh-outputs";
import * as taproot from "./test-data/p2tr-outputs";

type RawTxOutput = {
  value:string
  pkScript:string
  scriptSize:number
  totalSize:number
}

type RawOutputs = {
  raw:string
  outputs: RawTxOutput[]
}

describe("BtcUtils", function () {
  let BtcUtils:BtcUtilsLib;
  
  before(async () => {
    const BtcUtilsFactory = await ethers.getContractFactory("BtcUtils");
    BtcUtils = await BtcUtilsFactory.deploy();
  });

  it("should validate P2SH address is generated from script", async () => {
    expect(
      await BtcUtils.validateP2SHAdress(
        ethers.toBeHex(ethers.decodeBase58("2MwTN5tpBPjpdNohzAucisM8FFUsB5kddWs")),
        "0x2096dce2f0d299c8b0de7c446cc45c0a3e24ec97e202aeb92ede94ee491bb03e6475522102cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1210362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a1242103c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db53ae",
        false
      )
    ).to.be.true

    expect(
      await BtcUtils.validateP2SHAdress(
        ethers.toBeHex(ethers.decodeBase58("n1nka7jPhBYUxBEEcYefW9zrNrwityvFvr")),
        "0x2096dce2f0d299c8b0de7c446cc45c0a3e24ec97e202aeb92ede94ee491bb03e6475522102cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1210362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a1242103c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db53ae",
        false
      )
    ).to.be.false
  });

  it("should calculate P2SH address from script", async () => {
    const result = await BtcUtils.getP2SHAddressFromScript('0x2096dce2f0d299c8b0de7c446cc45c0a3e24ec97e202aeb92ede94ee491bb03e6475522102cd53fc53a07f211641a677d250f6de99caf620e8e77071e811a28b3bcddf0be1210362634ab57dae9cb373a5d536e66a8c4f67468bbcfb063809bab643072d78a1242103c5946b3fbae03a654237da863c9ed534e0878657175b132b8ca630f245df04db53ae', false);
    expect(result).to.be.eq(ethers.toBeHex(ethers.decodeBase58("2MwTN5tpBPjpdNohzAucisM8FFUsB5kddWs")));
  });

  it("should extract timestamp from btc block header", async () => {
    const btcHeader =
      "0x0080cf2a0857bdec9d66f5feb52d00d5061ff02a904112d9b0cd1ac401000000000000003d2d2b5733c820a1f07ce6e0acd2ea47f27016b49ccb405b1e3e5786f8ae962e3ce30c63bc292d1919856362";

    const timestamp = await BtcUtils.getBtcBlockTimestamp(btcHeader);
    expect(timestamp).to.eq(1661788988n);

    const btcHeader2 = "0x" + "00".repeat(68) + "12345678" + "00".repeat(8);

    const timestamp2 = await BtcUtils.getBtcBlockTimestamp(btcHeader2);
    expect(timestamp2).to.eq(ethers.toBigInt("0x78563412"));
  });

  it("should fail to extract timestamp from btc block header with invalid length", async () => {
    const btcHeaderEmpty = "0x";
    const btcHeader79 = "0x" + "00".repeat(79);
    const btcHeader81 = "0x" + "00".repeat(81);

    await expect(BtcUtils.getBtcBlockTimestamp(btcHeaderEmpty)).to.be.revertedWith("Invalid header length");
    await expect(BtcUtils.getBtcBlockTimestamp(btcHeader79)).to.be.revertedWith("Invalid header length");
    await expect(BtcUtils.getBtcBlockTimestamp(btcHeader81)).to.be.revertedWith("Invalid header length");
  });

  it("should parse raw btc transaction pay to address script", async () => {
    const firstRawTX = "0x0100000001013503c427ba46058d2d8ac9221a2f6fd50734a69f19dae65420191e3ada2d40000000006a47304402205d047dbd8c49aea5bd0400b85a57b2da7e139cec632fb138b7bee1d382fd70ca02201aa529f59b4f66fdf86b0728937a91a40962aedd3f6e30bce5208fec0464d54901210255507b238c6f14735a7abe96a635058da47b05b61737a610bef757f009eea2a4ffffffff0200879303000000001976a9143c5f66fe733e0ad361805b3053f23212e5755c8d88ac0000000000000000426a403938343934346435383039323135366335613139643936356239613735383530326536646263326439353337333135656266343839373336333134656233343700000000";
    const firstTxOutputs = await BtcUtils.getOutputs(firstRawTX);

    const firstNullScript = await BtcUtils.parseNullDataScript(firstTxOutputs[1].pkScript);
    const firstDestinationAddress = await BtcUtils.parsePayToPubKeyHash(firstTxOutputs[0].pkScript, false);
    const firstValue = firstTxOutputs[0].value;
    const firstHash = await BtcUtils.hashBtcTx(firstRawTX);

    const secondRawTX = "0x01000000010178a1cf4f2f0cb1607da57dcb02835d6aa8ef9f06be3f74cafea54759a029dc000000006a473044022070a22d8b67050bee57564279328a2f7b6e7f80b2eb4ecb684b879ea51d7d7a31022057fb6ece52c23ecf792e7597448c7d480f89b77a8371dca4700a18088f529f6a012103ef81e9c4c38df173e719863177e57c539bdcf97289638ec6831f07813307974cffffffff02801d2c04000000001976a9143c5f66fe733e0ad361805b3053f23212e5755c8d88ac0000000000000000426a406539346138393731323632396262633966636364316630633034613237386330653130353265623736323666393365396137663130363762343036663035373600000000";
    const secondTxOutputs = await BtcUtils.getOutputs(secondRawTX);

    const secondNullScript = await BtcUtils.parseNullDataScript(secondTxOutputs[1].pkScript);
    const secondDestinationAddress = await BtcUtils.parsePayToPubKeyHash(secondTxOutputs[0].pkScript, true);
    const secondValue = secondTxOutputs[0].value;
    const secondHash = await BtcUtils.hashBtcTx(secondRawTX);

    expect(firstNullScript).to.eq("0x4039383439343464353830393231353663356131396439363562396137353835303265366462633264393533373331356562663438393733363331346562333437");
    expect(firstDestinationAddress).to.eq("0x6f3c5f66fe733e0ad361805b3053f23212e5755c8d");
    expect(firstValue).to.eq("60000000");
    expect(firstHash).to.eq("0x03c4522ef958f724a7d2ffef04bd534d9eca74ffc0b28308797d2853bc323ba6");

    expect(secondNullScript).to.eq("0x4065393461383937313236323962626339666363643166306330346132373863306531303532656237363236663933653961376631303637623430366630353736");
    expect(secondDestinationAddress).to.eq("0x003c5f66fe733e0ad361805b3053f23212e5755c8d");
    expect(secondValue).to.eq("70000000");
    expect(secondHash).to.eq("0xfd4251485dafe36aaa6766b38cf236b5925f23f12617daf286e0e92f73708aa3");
  });

  it('should parse btc raw transaction outputs correctly', async () => {
    const transactions:RawOutputs[] = [
      {
        raw: '0x01000000000101f73a1ea2f2cec2e9bfcac67b277cc9e4559ed41cfc5973c154b7bdcada92e3e90100000000ffffffff029ea8ef00000000001976a9141770fa9929eee841aee1bfd06f5f0a178ef6ef5d88acb799f60300000000220020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d0400473044022051db70142aac24e8a13050cb0f61183704a7fe572c41a09caf5e7f56b7526f87022017d1a4b068a32af3dcea2d9a0e2f0d648c9f0f7fb01698d83091fd5b57f69ade01473044022028f29f5444ea4be2db3c6895e1414caa5cee9ab79faf1bf9bc12191f421de37102205af1df5158aa9c666f2d8d4d7c9da1ef96d28277f5d4b7c193e93e243a6641ae016952210375e00eb72e29da82b89367947f29ef34afb75e8654f6ea368e0acdfd92976b7c2103a1b26313f430c4b15bb1fdce663207659d8cac749a0e53d70eff01874496feff2103c96d495bfdd5ba4145e3e046fee45e84a8a48ad05bd8dbb395c011a32cf9f88053ae00000000',
        outputs:[
          {
            value: '15706270',
            pkScript: '0x76a9141770fa9929eee841aee1bfd06f5f0a178ef6ef5d88ac',
            scriptSize: 25,
            totalSize: 34
          },
          {
            value: '66492855',
            pkScript: '0x0020701a8d401c84fb13e6baf169d59684e17abd9fa216c8cc5b9fc63d622ff8c58d',
            scriptSize: 34,
            totalSize: 43
          }
        ]
      },
      {
        raw: '0x010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff1a03583525e70ee95696543f47000000002f4e696365486173682fffffffff03c01c320000000000160014b0262460a83e78d991795007477d51d3998c70629581000000000000160014d729e8dba6f86b5c8d7b3066fd4d7d0e21fd079b0000000000000000266a24aa21a9edf052bd805f949d631a674158664601de99884debada669f237cf00026c88a5f20120000000000000000000000000000000000000000000000000000000000000000000000000',
        outputs:[
          {
            value: '3284160',
            pkScript: '0x0014b0262460a83e78d991795007477d51d3998c7062',
            scriptSize: 22,
            totalSize: 31
          },
          {
            value: '33173',
            pkScript: '0x0014d729e8dba6f86b5c8d7b3066fd4d7d0e21fd079b',
            scriptSize: 22,
            totalSize: 31
          },
          {
            value: '0',
            pkScript: '0x6a24aa21a9edf052bd805f949d631a674158664601de99884debada669f237cf00026c88a5f2',
            scriptSize: 38,
            totalSize: 47
          }
        ]
      },
      {
        raw: '0x0100000000010fe0305a97189636fb57126d2f77a6364a5c6a809908270583438b3622dce6bc050000000000ffffffff6d487f63c4bd89b81388c20aeab8c775883ed56f11f509c248a7f00cdc64ae940000000000ffffffffa3d3d42b99de277265468acca3c081c811a9cc7522827aa95aeb42653c15fc330000000000ffffffffd7818dabb051c4db77da6d49670b0d3f983ba1d561343027870a7f3040af44fe0000000000ffffffff72daa44ef07b8d85e8ef8d9f055e07b5ebb8e1ba6a876e17b285946eb4ea9b9b0000000000ffffffff5264480a215536fd00d229baf1ab8c7c65ce10f37b783ca9700a828c3abc952c0000000000ffffffff712209f13eee0b9f3e6331040abcc09df750e4a287128922426d8d5c78ac9fc50000000000ffffffff21c5cf14014d28ec43a58f06f8e68c52c524a2b47b3be1c5800425e1f35f488d0000000000ffffffff2898464f9eb34f1d77fde2ed75dd9ae9c258f76030bb33be8e171d3e5f3b56390000000000ffffffffd27a5adff11cffc71d88face8f5adc2ce43ad648a997a5d54c06bcdec0e3eb5c0000000000ffffffff5217ca227f0e7f98984f19c59f895a3cfa7b05cb46ed844e2b0a26c9f5168d7a0000000000ffffffff8384e811f57e4515dd79ebfacf3a653200caf77f115bb6d4efe4bc534f0a39dd0000000000ffffffffd0448e1aae0ea56fab1c08dae1bdfe16c46f8ae8cec6042f6525bb7c1da0fa380000000000ffffffff5831c6df8395e3dc315af82c758c622156e2c40d677dececb717f4f20ded28a90000000000ffffffff56c2ffb0554631cff11e3e3fa90e6f35e76f420b29cde1faaa68c07cd0c6f8030100000000ffffffff02881300000000000016001463052ae51729396821a0cd91e0b1e9c61f53e168424e0800000000001600140d76db7b4f8f93a0b445bd782df2182a3e577604024730440220260695f8cf81168b46a24a07c380fd2568ee72f939309ed710e055f146d267db022044813ec9d65a57c8d4298b0bd9600664c3875bd2230b6a376a6fc70577a222bb012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302483045022100e0ed473c35a937d0b4d1a5e08f8e61248e80f5fe108c9b8b580792df8675a05d02202073dfd0d44d28780ee321c8a2d18da8157055d37d68793cbe8c53cc1c0a5321012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302473044022034e28210fe7a14dde84cdb9ef4cf0a013bbc027deebcb56232ff2dabb25c12dc02202f4ff4df794ad3dbcfa4d498ec6d0c56b22c027004767851e3b8ffc5652ba529012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302473044022030d5f4ffddf70a6086269ce982bff38c396831d0b5ef5205c3e557059903b2550220575bcf3b233c12b383bf2f16cd52e2fff2c488f0aa29ab3dec22b85b536b1c83012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302483045022100cc07265538f0ea4a8b999450549a965b0cc784371cac42cbcf8f49fbabf72b7c02207ef68377d7c6d3817d7c1a7a7936392b7043189ab1aed81eb0a7a3ad424bdcaf012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d230248304502210085a8855abe9fd6680cb32911db66914cf970a30f01ecd17c7527fc369bb9f24002206da3457505a514a076954a2e5756fcc14c9e8bdc18301469dfe5b2b6daef723f012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302483045022100d4e1963f5945dfae7dc73b0af1c65cf9156995a270164c2bcbc4a539130ac268022054464ea620730129ebaf95202f96f0b8be74ff660fcd748b7a107116e01730f3012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d230247304402207a5386c7b8bf3cf301fed36e18fe6527d35bc02007afda183e81fc39c1c8193702203207a6aa2223193a5c75ed8df0e046d390dbf862a3d0da1b2d0f300dfd42e8a7012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302483045022100c8db534b9ed20ce3a91b01b03e97a8f60853fbc16d19c6b587f92455542bc7c80220061d61d1c49a3f0dedecefaafc51526325bca972e99aaa367f2ebcab95d42395012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302483045022100f5287807debe8fc2eeee7adc5b7da8a212166a4580b8fdcf402c049a40b24fb7022006cb422492ba3b1ec257c64e74f3d439c00351f05bc05e88cab5cd9d4a7389b0012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d230247304402202edb544a679791424334e3c6a85613482ca3e3d16de0ca0d41c54babada8d4a2022025d0c937221161593bd9858bb3062216a4e55d191a07323104cfef1c7fcf5bc6012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d230247304402201a6cf02624884d4a1927cba36b2b9b02e1e6833a823204d8670d71646d2dd2c40220644176e293982f7a4acb25d79feda904a235f9e2664c823277457d33ccbaa6dc012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302483045022100d49488c21322cd9a7c235ecddbd375656d98ba1ca06a5284c8c2ffb6bcbba83b02207dab29958d7c1b2466d5b5502b586d7f3d213b501689d42a313de91409179899012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2302483045022100f36565200b245429afb9cdc926510198893e057e5244a7dabd94bedba394789702206786ea4033f5e1212cee9a59fb85e89b6f7fe686ab0a3b8874e77ea735e7c3b5012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d230247304402206ff3703495e0d872cbd1332d20ee39c14de6ed5a14808d80327ceedfda2329e102205da8497cb03776d5df8d67dc16617a6a3904f7abf85684a599ed6c60318aa3be012102b4ee3edac446129ec8c011afaba3e5e1ead0cebfd8545f3f6984c167277f8d2300000000',
        outputs:[
          {
            value: '5000',
            pkScript: '0x001463052ae51729396821a0cd91e0b1e9c61f53e168',
            scriptSize: 22,
            totalSize: 31
          },
          {
            value: '544322',
            pkScript: '0x00140d76db7b4f8f93a0b445bd782df2182a3e577604',
            scriptSize: 22,
            totalSize: 31
          }
        ]
      },
      {
        raw: '0x01000000010178a1cf4f2f0cb1607da57dcb02835d6aa8ef9f06be3f74cafea54759a029dc000000006a473044022070a22d8b67050bee57564279328a2f7b6e7f80b2eb4ecb684b879ea51d7d7a31022057fb6ece52c23ecf792e7597448c7d480f89b77a8371dca4700a18088f529f6a012103ef81e9c4c38df173e719863177e57c539bdcf97289638ec6831f07813307974cffffffff02801d2c04000000001976a9143c5f66fe733e0ad361805b3053f23212e5755c8d88ac0000000000000000426a406539346138393731323632396262633966636364316630633034613237386330653130353265623736323666393365396137663130363762343036663035373600000000',
        outputs:[
          {
            value: '70000000',
            pkScript: '0x76a9143c5f66fe733e0ad361805b3053f23212e5755c8d88ac',
            scriptSize: 25,
            totalSize: 34
          },
          {
            value: '0',
            pkScript: '0x6a4065393461383937313236323962626339666363643166306330346132373863306531303532656237363236663933653961376631303637623430366630353736',
            scriptSize: 66,
            totalSize: 75
          }
        ]
      },
      {
        raw: '0x020000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff050261020101ffffffff02205fa012000000001976a91493fa9b864d39108a311918320e2a804de2e946f688ac0000000000000000266a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf90120000000000000000000000000000000000000000000000000000000000000000000000000',
        outputs:[
          {
            value: '312500000',
            pkScript: '0x76a91493fa9b864d39108a311918320e2a804de2e946f688ac',
            scriptSize: 25,
            totalSize: 34
          },
          {
            value: '0',
            pkScript: '0x6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9',
            scriptSize: 38,
            totalSize: 47
          }
        ]
      },
      {
        raw: '0x020000000001010e02566bfc272aed951a7f68152707fd14d29aaf2fe4c8106e623faec848437c0000000000fdffffff02dba01800000000001976a914b2978fcacc03e34dae7b0d9ef112a7b3e5c0bdc488ac03a10185120000001976a9142591f7537994333dc2c119a88defb5b53d34495188ac0247304402205bdb0dfbbeb0ffc7f2d86cd1026a893252f49399d22876dfe6f3ff1ce723507502200f155b8fab03352aec2b07bbd0e0ab147454937f34301518b428af7c6216b79d01210249b9c2a173ec4c9bfae80edf85fa48ff9e196856bf7f48f2208800760bb28d07d4322500',
        outputs:[
          {
            value: '1614043',
            pkScript: '0x76a914b2978fcacc03e34dae7b0d9ef112a7b3e5c0bdc488ac',
            scriptSize: 25,
            totalSize: 34
          },
          {
            value: '79540887811',
            pkScript: '0x76a9142591f7537994333dc2c119a88defb5b53d34495188ac',
            scriptSize: 25,
            totalSize: 34
          }
        ]
      },
      {
        raw: '0x010000000001050010b625779e40b4e8d1288e9db32a9a4026f7e98d0ee97a2fd1b43ca8882a460000000000ffffffff0010b625779e40b4e8d1288e9db32a9a4026f7e98d0ee97a2fd1b43ca8882a460100000000ffffffff0010b625779e40b4e8d1288e9db32a9a4026f7e98d0ee97a2fd1b43ca8882a460300000000fffffffffd67dda5d256393b6e5b4a1ba117c7b60ebb0ff17ff22d4743f12f3a84bcf84e0100000000fffffffffd67dda5d256393b6e5b4a1ba117c7b60ebb0ff17ff22d4743f12f3a84bcf84e0200000000ffffffff060000000000000000536a4c5063cc1853d0117afb0b709321a29ebd6bff4f0488774c3df3a7eae1f237bce099355a809b79d8e327b4844d4d5b01039c68d000fb57d906712c9403a0561a5cd7175d314dbb75bfa53cd033620f916501a60e000000000000160014f58e1a72b69982143e10e505a61f37aa368d92441302010000000000160014323d105482f5065dcd51f1bc5a213d5d723d58dda6870100000000001600140ccce8622a77f0316227cd311fb233bce31f76f6a68701000000000016001463ac4816199ba682879a2373a16fac78c51f6bdaa687010000000000160014b84a456a5a8af29af60d72b03958a9bebf76e6e502483045022100d1fb958108531911fc0ba7df04267c1842718f1d871c555f8b6ce30cc117d4ca022032099c3918c491d0af7fdded1811e2cd0e86b99458661d97ae87ded3c889382001210257d3f874b8203ed7d4fc254d67f68b67e954c19cd37b1b6a6ce7346a52b437230247304402201cbeb5d7865aa47b6a6692b89fbbcd4caad7047b71db97e42b09149594bb141402207b1eaa83ab4ebcf8b063bc401f892043c8cf346e4993bdfdc9f4f979c27ac8b001210326010652c2334417db10fddc0bb10749a3256555dd22ebe1575da9eb3aeccf530247304402205dbc9abd0df608e9548c8e5b3771f7b1f20ad170951a8c254f620ed989a7ea61022002d00d0739f33eb5afd5d7c5e07891c66939656dd024c6fbde8515d4104c052c0121020802d7c7e0e6f040644950f0712d7225cc4b755ece3e0d61568d6c8e362e375c02483045022100db6c33de82ae9e7abbdcd99265931307716112771d2e4273a7381c63e779a2ae02203376181e7e3474b6e771eea127b9ce943ef1025e9190a75304d9cf94d52ed429012103d1609fe77bb362648e9253ed09b7a560448f93fb0612a74db179ac22cc89e86302483045022100f99a02db4e116b3ff92de3cb0af8e3cf29518695fdfadac6cc9cd2104ae009d402206a1e7060874834a68aa7ad5b2ef19ea29c1f04af61aab28c589dfa8937f2287a012103dbfb01dde37e538772edf37434b4b4268f10ab8ed7e1e6a98f89e50aa1a11f2500000000',
        outputs:[
          {
            value: '0',
            pkScript: '0x6a4c5063cc1853d0117afb0b709321a29ebd6bff4f0488774c3df3a7eae1f237bce099355a809b79d8e327b4844d4d5b01039c68d000fb57d906712c9403a0561a5cd7175d314dbb75bfa53cd033620f916501',
            scriptSize: 83,
            totalSize: 92
          },
          {
            value: '3750',
            pkScript: '0x0014f58e1a72b69982143e10e505a61f37aa368d9244',
            scriptSize: 22,
            totalSize: 31
          },
          {
            value: '66067',
            pkScript: '0x0014323d105482f5065dcd51f1bc5a213d5d723d58dd',
            scriptSize: 22,
            totalSize: 31
          },
          {
            value: '100262',
            pkScript: '0x00140ccce8622a77f0316227cd311fb233bce31f76f6',
            scriptSize: 22,
            totalSize: 31
          },
          {
            value: '100262',
            pkScript: '0x001463ac4816199ba682879a2373a16fac78c51f6bda',
            scriptSize: 22,
            totalSize: 31
          },
          {
            value: '100262',
            pkScript: '0x0014b84a456a5a8af29af60d72b03958a9bebf76e6e5',
            scriptSize: 22,
            totalSize: 31
          }
        ]
      },
      {
        raw: '0x010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff1e0367352519444d47426c6f636b636861696ee2fb0ac80e02000000000000ffffffff02e338260000000000160014b23716e183ba0949c55d6cac21a3e94176eed1120000000000000000266a24aa21a9ed561c4fd92722cf983c8c24e78ef35a4634e3013695f09186bc86c6a627f21cfa0120000000000000000000000000000000000000000000000000000000000000000000000000',
        outputs:[
          {
            value: '2504931',
            pkScript: '0x0014b23716e183ba0949c55d6cac21a3e94176eed112',
            scriptSize: 22,
            totalSize: 31
          },
          {
            value: '0',
            pkScript: '0x6a24aa21a9ed561c4fd92722cf983c8c24e78ef35a4634e3013695f09186bc86c6a627f21cfa',
            scriptSize: 38,
            totalSize: 47
          }
        ]
      },
      {
        raw: '0x020000000001016bcabaaf4e28636c4c68252a019268927b79a978cc7a9c2e561d7053dd0bf73b0000000000fdffffff0296561900000000001976a9147aa8184685ca1f06f543b64a502eb3b6135d672088acf9d276e3000000001976a9145ce7908503ef69bfde873fe886133ab8dc23363188ac02473044022078607e1ca987e18ee8934b44ff8a4f0751d27a110540d99deb0a386adbf638c002200a01dc0314bef9b8c966c7a02440309596a6380e1625a7872ed616327a729bed0121029e1bb76f522491f90c542385e6dbff36b92f8984b74f24d0b99b52ea17bed09961352500',
        outputs:[
          {
            value: '1660566',
            pkScript: '0x76a9147aa8184685ca1f06f543b64a502eb3b6135d672088ac',
            scriptSize: 25,
            totalSize: 34
          },
          {
            value: '3816215289',
            pkScript: '0x76a9145ce7908503ef69bfde873fe886133ab8dc23363188ac',
            scriptSize: 25,
            totalSize: 34
          }
        ]
      },
      {
        raw: '0x020000000001014aea9ffcf9be9c98a2a3ceb391483328ff406177fdb60047886a50f33569e0540000000000fdffffff02ce095d5a120000001976a914c38cfd37c4b53ebae78de708a3d8438f6e7cc56588acbc622e00000000001976a914c3ea6613a9dcbf0a63863ec3a3b958127d597b4988ac02473044022009351dd62b2494924397a626524a5c08e16d4d214488b847e7a9cd97fa4aac2302200f5a54fff804f19edf316daaea58052a5f0c2ff3de236a45e05a43474e3a6ddf01210258f308ea046d38403d5afb201df933196b7948acead3048a0413bbaacdc42db166352500',
        outputs:[
          {
            value: '78825458126',
            pkScript: '0x76a914c38cfd37c4b53ebae78de708a3d8438f6e7cc56588ac',
            scriptSize: 25,
            totalSize: 34
          },
          {
            value: '3039932',
            pkScript: '0x76a914c3ea6613a9dcbf0a63863ec3a3b958127d597b4988ac',
            scriptSize: 25,
            totalSize: 34
          }
        ]
      },
      {
        raw: '0x010000000127d57276f1026a95b4af3b03b6aba859a001861682342af19825e8a2408ae008010000008c493046022100cd92b992d4bde3b44471677081c5ece6735d6936480ff74659ac1824d8a1958e022100b08839f167532aea10acecc9d5f7044ddd9793ef2989d090127a6e626dc7c9ce014104cac6999d6c3feaba7cdd6c62bce174339190435cffd15af7cb70c33b82027deba06e6d5441eb401c0f8f92d4ffe6038d283d2b2dd59c4384b66b7b8f038a7cf5ffffffff0200093d0000000000434104636d69f81d685f6f58054e17ac34d16db869bba8b3562aabc38c35b065158d360f087ef7bd8b0bcbd1be9a846a8ed339bf0131cdb354074244b0a9736beeb2b9ac40420f0000000000fdba0f76a9144838a081d73cf134e8ff9cfd4015406c73beceb388acacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacac00000000',
        outputs: [
          {
            value: '4000000',
            pkScript: '0x4104636d69f81d685f6f58054e17ac34d16db869bba8b3562aabc38c35b065158d360f087ef7bd8b0bcbd1be9a846a8ed339bf0131cdb354074244b0a9736beeb2b9ac',
            scriptSize: 67,
            totalSize: 76
          },
          {
            value: '1000000',
            pkScript: '0x76a9144838a081d73cf134e8ff9cfd4015406c73beceb388acacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacac',
            scriptSize: 4026,
            totalSize: 4037
          }
        ]
      }
    ];

    let outputs;
    for (let tx of transactions) {
      outputs = await BtcUtils.getOutputs(tx.raw);
      expect(outputs.length).to.eq(tx.outputs.length);
      for (let i = 0;  i < outputs.length; i++) {
        expect(outputs[i].value).to.eq(tx.outputs[i].value.toString());
        expect(outputs[i].pkScript).to.eq(tx.outputs[i].pkScript);
        expect(outputs[i].scriptSize).to.eq(tx.outputs[i].scriptSize.toString());
        expect(outputs[i].totalSize).to.eq(tx.outputs[i].totalSize.toString());
      }
    }
  });

  [
    {
      type: 'null-script',
      raw: '0x010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff210310a3250452ecbe640c1002b03dc6dc0100000000000a2f70656761706f6f6c2f00000000020000000000000000266a24aa21a9eddbfb67dc0f51fb5baaadca59fdf7a14fd957307122b2c36a585bd070e8ecaba96b6125000000000017a914e25a7e08e6e072900eba0e4a933069846dd7e77b870120000000000000000000000000000000000000000000000000000000000000000000000000',
      outputs: [
        {
          value: 0,
          pkScript: '0x6a24aa21a9eddbfb67dc0f51fb5baaadca59fdf7a14fd957307122b2c36a585bd070e8ecaba9',
          scriptSize: 38,
          totalSize: 47n
        },
        {
          value: 2449771,
          pkScript: '0xa914e25a7e08e6e072900eba0e4a933069846dd7e77b87',
          scriptSize: 23,
          totalSize: 32n
        }
      ]
    },
    {
      type: 'P2PKH',
      raw: '0x0100000001477c50ac2967ff946354e19eee0e33183ecc19e6f4c8526487cccb49729a4438010000006a47304402206ebe70b56cfce62e05ec668b117e9e94797e7861bf49552c2664abffba0426d9022001ca8ec22ab9e47658ff8fa52c7ec61472ae1be50a78df8fd1d152207f0e285e0121034f798c0addbbdb5cca45e532440ac649f0e2c4c6fc12a0e3d5cb6f44ff589913ffffffff0210270000000000001976a914a7bb3acc90da95c20b1c62f19b82a2a53cf338bc88acd5ff0900000000001976a9140d82ca7a360a66730f328a018024c60b2df6289388ac00000000',
      outputs: [
        {
          value: 10000n,
          pkScript: '0x76a914a7bb3acc90da95c20b1c62f19b82a2a53cf338bc88ac',
          scriptSize: 25,
          totalSize: 34n
        },
        {
          value: 655317n,
          pkScript: '0x76a9140d82ca7a360a66730f328a018024c60b2df6289388ac',
          scriptSize: 25,
          totalSize: 34n
        }
      ]
    },
    {
      type: 'P2TR',
      raw: '0x01000000000101dc7e71826699b64e9360b507817a8131470931af6dd8ca77dc58c377948ce5520100000000fdffffff02172f00000000000022512065fef4f1d375728642658f3d9733bbedafff901dafd53286f7db5962c12466ee11680d00000000002251204aa5737545b86895c8326a9cb237f713850647c19652b5cac2eddd2974ca4dbc0140bedf6b99e10383f114c403162c465d2599b1413e9bb7197fe1172d25e3a5884a481964f1f11100a74c56e7e6188e59d8624af74eee46f9755416763b491cbfa600000000',
      outputs: [
        {
          value: 12055n,
          pkScript: '0x512065fef4f1d375728642658f3d9733bbedafff901dafd53286f7db5962c12466ee',
          scriptSize: 34,
          totalSize: 43n
        },
        {
          value: 878609n,
          pkScript: '0x51204aa5737545b86895c8326a9cb237f713850647c19652b5cac2eddd2974ca4dbc',
          scriptSize: 34,
          totalSize: 43n
        }
      ]
    },
    {
      type: 'P2WPKH',
      raw: '0x02000000000101f856190c1d28ea76a318d1a0b45eb47d083c2035529aeefcd70467d7891033450100000000feffffff0260440f00000000001600148d645a9586a633e1a226b9fa781dfe123b32ba14531e000000000000160014efba5a3dfcaa1a80b9a83b5ee1e5f695a4508cfa0247304402203eb5b593595675f1373bc0db197262f9807ed2088fab66d2d27edc039554666d022071d2d46db743e970d2f82c256e9970fb8d4fe359021e780aff62bf56980a325b012103377a28356ffdd7493c857be41ec46d263e75fa33271948b8ce443e86da728ccda3a22500',
      outputs: [
        {
          value: 1000544n,
          pkScript: '0x00148d645a9586a633e1a226b9fa781dfe123b32ba14',
          scriptSize: 22,
          totalSize: 31n
        },
        {
          value: 7763n,
          pkScript: '0x0014efba5a3dfcaa1a80b9a83b5ee1e5f695a4508cfa',
          scriptSize: 22,
          totalSize: 31n
        }
      ]
    },
    {
      type: 'P2SH',
      raw: '0x02000000000103b8794a1c0a21b4097c8f6e7e94a6e0d1a4682e56cacc557ae98e02f8b854bb27000000006a47304402206f448f0e77ed49ed992a0772c8799b6ba9b079defe6c8e7f590675f8df64b505022015e3f6e2229017be1f2d4fddf1071ab124e6f5b109a9c28655284645df1d881e012103c6b6ebd707d3ea7156e918e1ebb98397c2e3ec7ec029b6136f8d3e22a93892c5feffffff5e247025eed3f3981505214b21cbe2e5c134c54dd1b3b7d96c4f9182bb75bff40000000017160014dea8c30fe6dc8621ec298e5a502f100b8f6a688ffeffffffc470e4f1e00e63b0e1ece95a1979949e4f2471d7da28a8b65ca024da9a1c198e000000006a473044022020d4c8152f9e1032a99e50d42838bbf3eb0a1af2ae5ee4c5063e17e8616d82e2022055c1f231525eb81f0dfd236d923f223499f6a61a463deeb111d472670de4923d01210245b4129b08f7407a0d277e92e5a80c9857efbc843cfa76064cccf9c87b02b8ebfeffffff03db2410000000000017a914d4486d9481afeb59669966ef641d1be2d30a452587ada101000000000017a914b5dcdebc745f68e93e344cad411383389b15f42b87ed970100000000001976a914aa25b49710a2896df84248820c9c0d53cbc4971988ac000247304402201d857f01267ef0bf44a2f16e776733c0a430ebdc7a883ce68fdd7e07dae34b79022001e773ea33164d189694b58c7cc206ef0603e9b6b1d474f8f0abe18e32b22a01012103841f5308221e677e288593f037becd34b441aa5d7b2f54121836ed5cf07265a30003a32500',
      outputs: [
        {
          value: 1058011n,
          pkScript: '0xa914d4486d9481afeb59669966ef641d1be2d30a452587',
          scriptSize: 23,
          totalSize: 32n
        },
        {
          value: 106925n,
          pkScript: '0xa914b5dcdebc745f68e93e344cad411383389b15f42b87',
          scriptSize: 23,
          totalSize: 32n
        },
        {
          value: 104429n,
          pkScript: '0x76a914aa25b49710a2896df84248820c9c0d53cbc4971988ac',
          scriptSize: 25,
          totalSize: 34n
        }
      ]
    },
    {
      type: 'P2PK',
      raw: '0x01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0e04b3eb494d0103062f503253482fffffffff0100f2052a010000002321023824dbed2574c88ee375788d9569df0ea0b24ccfd2a1ca71ea2c744367de735bac00000000',
      outputs: [
        {
          value: 5000000000n,
          pkScript: '0x21023824dbed2574c88ee375788d9569df0ea0b24ccfd2a1ca71ea2c744367de735bac',
          scriptSize: 35,
          totalSize: 44n
        }
      ]
    },
    {
      type: 'P2WSH',
      raw: '0x0100000001ac7de87ae01110ed6803bb49279886a89cf473bc0bdd48cae960aed59b21ac77000000006b483045022100e12ddb2662bd3c44d482eef808a6fcc84805470c147a477d3b8c9b52b5608be3022060639ddb5690b340f51f935a4a8a1a4151116714c9f84e72791e482840525ca30121029d9286a9c0e8b9e8182d5cc18f3848834c906ed6c6c0b49c86b822f0ed67c9baffffffff016003b80700000000220020615ae01ed1bc1ffaad54da31d7805d0bb55b52dfd3941114330368c1bbf69b4c00000000',
      outputs: [
        {
          value: 129500000n,
          pkScript: '0x0020615ae01ed1bc1ffaad54da31d7805d0bb55b52dfd3941114330368c1bbf69b4c',
          scriptSize: 34,
          totalSize: 43n
        }
      ]
    }
  ].forEach((transaction) => {
    it(`should parse a transaction with a ${transaction.type} output`, async () => {
      const outputs = await BtcUtils.getOutputs(transaction.raw);
      expect(outputs.length).to.eq(transaction.outputs.length);
      for (let i = 0;  i < outputs.length; i++) {
        expect(outputs[i].value).to.eq(transaction.outputs[i].value);
        expect(outputs[i].pkScript).to.eq(transaction.outputs[i].pkScript);
        expect(outputs[i].scriptSize).to.eq(transaction.outputs[i].scriptSize);
        expect(outputs[i].totalSize).to.eq(transaction.outputs[i].totalSize);
      }
    });
  });

  describe('isP2PKHOutput function should', () => {
    it('return true if the script is a P2PKH script', async () => {
      for (const output of p2kph.testnetOutputs.concat(p2kph.mainnetOutputs)) {
        const result = await BtcUtils.isP2PKHOutput(output.script);
        expect(result).to.be.true;
      }
    });

    it('return false if the script is not a P2PKH script', async () => {
      const testCases = taproot.testnetOutputs
        .concat(taproot.mainnetOutputs)
        .concat(p2sh.testnetOutputs)
        .concat(p2sh.mainnetOutputs)
        .concat(p2wsh.testnetOutputs)
        .concat(p2wsh.mainnetOutputs)
        .concat(p2wpkh.testnetOutputs)
        .concat(p2wpkh.mainnetOutputs);
      for (const output of testCases) {
        const result = await BtcUtils.isP2PKHOutput(output.script);
        expect(result).to.be.false;
      }
    });
  });

  describe('isP2SHOutput function should', () => {
    it('return true if the script is a P2SH script', async () => {
      for (const output of p2sh.testnetOutputs.concat(p2sh.mainnetOutputs)) {
        const result = await BtcUtils.isP2SHOutput(output.script);
        expect(result).to.be.true;
      }
    });

    it('return false if the script is not a P2SH script', async () => {
      const testCases = taproot.testnetOutputs
        .concat(taproot.mainnetOutputs)
        .concat(p2kph.testnetOutputs)
        .concat(p2kph.mainnetOutputs)
        .concat(p2wsh.testnetOutputs)
        .concat(p2wsh.mainnetOutputs)
        .concat(p2wpkh.testnetOutputs)
        .concat(p2wpkh.mainnetOutputs);
      for (const output of testCases) {
        const result = await BtcUtils.isP2SHOutput(output.script);
        expect(result).to.be.false;
      }
    });
  });

  describe('isP2WPKHOutput function should', () => {
    it('return true if the script is a P2WPKH script', async () => {
      for (const output of p2wpkh.testnetOutputs.concat(p2wpkh.mainnetOutputs)) {
        const result = await BtcUtils.isP2WPKHOutput(output.script);
        expect(result).to.be.true;
      }
    });

    it('return false if the script is not a P2WPKH script', async () => {
      const testCases = taproot.testnetOutputs
        .concat(taproot.mainnetOutputs)
        .concat(p2kph.testnetOutputs)
        .concat(p2kph.mainnetOutputs)
        .concat(p2wsh.testnetOutputs)
        .concat(p2wsh.mainnetOutputs)
        .concat(p2sh.testnetOutputs)
        .concat(p2sh.mainnetOutputs);
      for (const output of testCases) {
        const result = await BtcUtils.isP2WPKHOutput(output.script);
        expect(result).to.be.false;
      }
    });
  });

  describe('isP2WSHOutput function should', () => {
    it('return true if the script is a P2WSH script', async () => {
      for (const output of p2wsh.testnetOutputs.concat(p2wsh.mainnetOutputs)) {
        const result = await BtcUtils.isP2WSHOutput(output.script);
        expect(result).to.be.true;
      }
    });

    it('return false if the script is not a P2WSH script', async () => {
      const testCases = taproot.testnetOutputs
        .concat(taproot.mainnetOutputs)
        .concat(p2kph.testnetOutputs)
        .concat(p2kph.mainnetOutputs)
        .concat(p2sh.testnetOutputs)
        .concat(p2sh.mainnetOutputs)
        .concat(p2wpkh.testnetOutputs)
        .concat(p2wpkh.mainnetOutputs);
      for (const output of testCases) {
        const result = await BtcUtils.isP2WSHOutput(output.script);
        expect(result).to.be.false;
      }
    });
  });

  describe('isP2TROutput function should', () => {
    it('return true if the script is a P2TR script', async () => {
      for (const output of taproot.testnetOutputs.concat(taproot.mainnetOutputs)) {
        const result = await BtcUtils.isP2TROutput(output.script);
        expect(result).to.be.true;
      }
    });

    it('return false if the script is not a P2TR script', async () => {
      const testCases = p2wsh.testnetOutputs
        .concat(p2wsh.mainnetOutputs)
        .concat(p2kph.testnetOutputs)
        .concat(p2kph.mainnetOutputs)
        .concat(p2sh.testnetOutputs)
        .concat(p2sh.mainnetOutputs)
        .concat(p2wpkh.testnetOutputs)
        .concat(p2wpkh.mainnetOutputs);
      for (const output of testCases) {
        const result = await BtcUtils.isP2TROutput(output.script);
        expect(result).to.be.false;
      }
    });
  });

  describe('parsePayToScriptHash function should', () => {
    it('parse properly the P2SH scripts and return the corresponding address', async () => {
      for (const output of p2sh.testnetOutputs) {
        const address = await BtcUtils.parsePayToScriptHash(output.script, false);
        expect(bs58check.encode(ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of p2sh.mainnetOutputs) {
        const address = await BtcUtils.parsePayToScriptHash(output.script, true);
        expect(bs58check.encode(ethers.getBytes(address))).to.equal(output.address);
      }
    });

    it('fail if script doesn\'t have the required structure', async () => {
      const testnetCases = taproot.testnetOutputs.concat(p2kph.testnetOutputs).concat(p2wsh.testnetOutputs).concat(p2wpkh.testnetOutputs);
      const mainnetCases = taproot.mainnetOutputs.concat(p2kph.mainnetOutputs).concat(p2wsh.mainnetOutputs).concat(p2wpkh.mainnetOutputs);
      for (const output of testnetCases) {
        await expect(BtcUtils.parsePayToScriptHash(output.script, false)).to.be.revertedWith("Script hasn't the required structure");
      }
      for (const output of mainnetCases) {
        await expect(BtcUtils.parsePayToScriptHash(output.script, true)).to.be.revertedWith("Script hasn't the required structure");
      }
    });
  });

  describe('parsePayToPubKeyHash function should', () => {
    it('parse properly the P2PKH scripts and return the corresponding address', async () => {
      for (const output of p2kph.testnetOutputs) {
        const address = await BtcUtils.parsePayToPubKeyHash(output.script, false);
        expect(bs58check.encode(ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of p2kph.mainnetOutputs) {
        const address = await BtcUtils.parsePayToPubKeyHash(output.script, true);
        expect(bs58check.encode(ethers.getBytes(address))).to.equal(output.address);
      }
    });

    it('fail if script doesn\'t have the correct format', async () => {
      const testnetCases = taproot.testnetOutputs.concat(p2sh.testnetOutputs).concat(p2wsh.testnetOutputs).concat(p2wpkh.testnetOutputs);
      const mainnetCases = taproot.mainnetOutputs.concat(p2sh.mainnetOutputs).concat(p2wsh.mainnetOutputs).concat(p2wpkh.mainnetOutputs);
      for (const output of testnetCases) {
        await expect(BtcUtils.parsePayToPubKeyHash(output.script, false)).to.be.revertedWith("Script hasn't the required structure");
      }
      for (const output of mainnetCases) {
        await expect(BtcUtils.parsePayToPubKeyHash(output.script, true)).to.be.revertedWith("Script hasn't the required structure");
      }
    });
  });

  describe('parsePayToWitnessPubKeyHash function should', () => {
    it('parse properly the P2WPKH scripts and return the corresponding address', async () => {
      for (const output of p2wpkh.testnetOutputs) {
        const address = await BtcUtils.parsePayToWitnessPubKeyHash(output.script);
        expect(bech32.encode('tb', ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of p2wpkh.mainnetOutputs) {
        const address = await BtcUtils.parsePayToWitnessPubKeyHash(output.script);
        expect(bech32.encode('bc', ethers.getBytes(address))).to.equal(output.address);
      }
    });

    it('fail if script doesn\'t have the correct format', async () => {
      const testnetCases = taproot.testnetOutputs.concat(p2sh.testnetOutputs).concat(p2wsh.testnetOutputs).concat(p2kph.testnetOutputs);
      const mainnetCases = taproot.mainnetOutputs.concat(p2sh.mainnetOutputs).concat(p2wsh.mainnetOutputs).concat(p2kph.mainnetOutputs);
      for (const output of testnetCases) {
        await expect(BtcUtils.parsePayToWitnessPubKeyHash(output.script)).to.be.revertedWith("Script hasn't the required structure");
      }
      for (const output of mainnetCases) {
        await expect(BtcUtils.parsePayToWitnessPubKeyHash(output.script)).to.be.revertedWith("Script hasn't the required structure");
      }
    });
  });

  describe('parsePayToWitnessScriptHash function should', () => {
    it('parse properly the P2WSH scripts and return the corresponding address', async () => {
      for (const output of p2wsh.testnetOutputs) {
        const address = await BtcUtils.parsePayToWitnessScriptHash(output.script);
        expect(bech32.encode('tb', ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of p2wsh.mainnetOutputs) {
        const address = await BtcUtils.parsePayToWitnessScriptHash(output.script);
        expect(bech32.encode('bc', ethers.getBytes(address))).to.equal(output.address);
      }
    });

    it('fail if script doesn\'t have the correct format', async () => {
      const testnetCases = taproot.testnetOutputs.concat(p2sh.testnetOutputs).concat(p2wpkh.testnetOutputs).concat(p2kph.testnetOutputs);
      const mainnetCases = taproot.mainnetOutputs.concat(p2sh.mainnetOutputs).concat(p2wpkh.mainnetOutputs).concat(p2kph.mainnetOutputs);
      for (const output of testnetCases) {
        await expect(BtcUtils.parsePayToWitnessScriptHash(output.script)).to.be.revertedWith("Script hasn't the required structure");
      }
      for (const output of mainnetCases) {
        await expect(BtcUtils.parsePayToWitnessScriptHash(output.script)).to.be.revertedWith("Script hasn't the required structure");
      }
    });
  });

  describe('parsePayToTaproot function should', () => {
    it('parse properly the P2TR scripts and return the corresponding address', async () => {
      for (const output of taproot.testnetOutputs) {
        const address = await BtcUtils.parsePayToTaproot(output.script);
        expect(bech32m.encode('tb', ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of taproot.mainnetOutputs) {
        const address = await BtcUtils.parsePayToTaproot(output.script);
        expect(bech32m.encode('bc', ethers.getBytes(address))).to.equal(output.address);
      }
    });

    it('fail if script doesn\'t have the correct format', async () => {
      const testnetCases = p2wsh.testnetOutputs.concat(p2sh.testnetOutputs).concat(p2wpkh.testnetOutputs).concat(p2kph.testnetOutputs);
      const mainnetCases = p2wsh.mainnetOutputs.concat(p2sh.mainnetOutputs).concat(p2wpkh.mainnetOutputs).concat(p2kph.mainnetOutputs);
      for (const output of testnetCases) {
        await expect(BtcUtils.parsePayToTaproot(output.script)).to.be.revertedWith("Script hasn't the required structure");
      }
      for (const output of mainnetCases) {
        await expect(BtcUtils.parsePayToTaproot(output.script)).to.be.revertedWith("Script hasn't the required structure");
      }
    });
  });

  describe('outputScriptToAddress function should', async () => {
    it('parse the script and return the address if its a supported type', async () => {
      for (const output of p2kph.testnetOutputs.concat(p2sh.testnetOutputs)) {
        const address = await BtcUtils.outputScriptToAddress(output.script, false);
        expect(bs58check.encode(ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of p2kph.mainnetOutputs.concat(p2sh.mainnetOutputs)) {
        const address = await BtcUtils.outputScriptToAddress(output.script, true);
        expect(bs58check.encode(ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of p2wpkh.mainnetOutputs.concat(p2wsh.mainnetOutputs)) {
        const address = await BtcUtils.outputScriptToAddress(output.script, true);
        expect(bech32.encode('bc', ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of p2wpkh.testnetOutputs.concat(p2wsh.testnetOutputs)) {
        const address = await BtcUtils.outputScriptToAddress(output.script, false);
        expect(bech32.encode('tb', ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of taproot.mainnetOutputs) {
        const address = await BtcUtils.outputScriptToAddress(output.script, true);
        expect(bech32m.encode('bc', ethers.getBytes(address))).to.equal(output.address);
      }
      for (const output of taproot.testnetOutputs) {
        const address = await BtcUtils.outputScriptToAddress(output.script, false);
        expect(bech32m.encode('tb', ethers.getBytes(address))).to.equal(output.address);
      }
    });

    it('fail if is an unsupported script type or script type cannot be converted to address', async() => {
      await expect(BtcUtils.outputScriptToAddress("0x0102030405", true)).to.be.revertedWith("Unsupported script type");
      await expect(BtcUtils.outputScriptToAddress("0x6a2448617468e76bc64be388085f432feb343fd758e1488af93af3df863092b28b3e40d60aec", false)).to.be.revertedWith("Unsupported script type");
    });
  });
});
