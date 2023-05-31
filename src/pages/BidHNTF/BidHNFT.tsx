import React, { useEffect, useState } from 'react';
import {
  Button,
  Input,
  Form,
  message,
  Upload,
  InputNumber,
  Collapse,
  Select,
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { compressImageFile, uploadProps } from '../../utils/upload.util';
import type { UploadFile } from 'antd/es/upload/interface';
import { useSearchParams } from 'react-router-dom';
import UserAvatar from '../../components/UserAvatar/UserAvatar';
import styles from './BidHNFT.module.scss';
import { useApproveAD3 } from '../../hooks/useApproveAD3';
import { useAD3Balance } from '../../hooks/useAD3Balance';
import {
  AuctionContractAddress,
  EIP5489ForInfluenceMiningContractAddress,
} from '../../models/parami';
import {
  inputFloatStringToAmount,
  BigIntToFloatString,
  deleteComma,
} from '../../utils/format.util';
import { usePreBid } from '../../hooks/usePreBid';
import { useCurBid } from '../../hooks/useCurrentBid';
import { useAuctionEvent } from '../../hooks/useAuctionEvent';
import { useAuthorizeSlotTo } from '../../hooks/useAuthorizeSlotTo';
import { BidWithSignature, createBid } from '../../services/bid.service';
import { useImAccount } from '../../hooks/useImAccount';
import { useCommitBid } from '../../hooks/useCommitBid';
import { uploadIPFS } from '../../services/ipfs.service';
import { useHNFT } from '../../hooks/useHNFT';

const { Panel } = Collapse;
const { Option } = Select;

interface BidHNFTProps {}

export enum IMAGE_TYPE {
  ICON = 'icon',
  POSTER = 'poster',
}

export interface UserInstruction {
  text: string;
  tag?: string;
  score?: number;
  link?: string;
}

const mockAdData = {
  icon: 'https://pbs.twimg.com/profile_images/1611305582367215616/4W9XpGpU.jpg',
  poster: 'https://pbs.twimg.com/media/FqlTSTOWYAA7yKN?format=jpg&name=small',
  title: 'Tweeting is Mining!',
  tag: 'twitter',
  url: 'https://twitter.com/ParamiProtocol',
};

// todo: get form auction.sol, current this is private
const MIN_DEPOIST_FOR_PRE_BID = 10;

const BidHNFT: React.FC<BidHNFTProps> = (props) => {
  const [form] = Form.useForm();
  const content = Form.useWatch('title', form);
  const { imAccount } = useImAccount();
  const [params] = useSearchParams();
  const tokenId = Number(params.get('tokenId') || '');
  const hnftAddress = params.get('hnftAddress') || '';

  const [adMetadataUrl, setAdMetadataUrl] = useState<string>();
  const [iconUploadFiles, setIconUploadFiles] = useState<UploadFile[]>([]);
  const [posterUploadFiles, setPosterUploadFiles] = useState<UploadFile[]>([]);
  const [bidLoading, setBidLoading] = useState<boolean>(false);

  const currentPrice = Number(useCurBid(hnftAddress, tokenId).amount);
  const minPrice = Math.max(currentPrice * 1.2, 1);

  const hnft = useHNFT(hnftAddress);
  const nftBalance = useAD3Balance(hnftAddress);
  const { approve, isSuccess: approveSuccess } = useApproveAD3(
    AuctionContractAddress,
    inputFloatStringToAmount('20')
  );
  // const {
  //   authorizeSlotTo,
  //   isSuccess: authorizeSlotToSuccess,
  //   currentSlotManager,
  // } = useAuthorizeSlotTo(tokenId, AuctionContractAddress);
  const {
    preBid,
    isSuccess: preBidSuccess,
    prepareError: preBidPrepareError,
  } = usePreBid(hnftAddress, tokenId);
  // const preBidReady = !!preBid;
  const [bidPreparedEvent, setBidPreparedEvent] = useState<any>();
  const { unwatch } = useAuctionEvent(
    'BidPrepared',
    (
      hNFTContractAddr: string,
      curBidId: string,
      preBidId: string,
      bidder: string
    ) => {
      console.log(bidder, curBidId, '---curBidId----');
      setBidPreparedEvent({
        bidder,
        curBidId,
        preBidId,
      });
    }
  );
  const [bidWithSig, setBidWithSig] = useState<BidWithSignature>();
  const { commitBid, isSuccess: commitBidSuccess } = useCommitBid(
    tokenId,
    hnftAddress,
    inputFloatStringToAmount('10'),
    adMetadataUrl,
    bidWithSig?.sig,
    bidWithSig?.prev_bid_id,
    bidWithSig?.id,
    bidWithSig?.last_bid_remain
  );
  const commitBidReady = !!commitBid;

  // todo: check if kol is authorized bid
  // useEffect(() => {
  //   console.log('currentSlotManager', currentSlotManager);
  // }, [currentSlotManager]);

  // // if the authorizeSlotSuccess then pledge some of ad3s
  // useEffect(() => {
  //   if (authorizeSlotToSuccess) {
  //     console.log('bid: pre bid after authorize');
  //     preBid?.();
  //   }
  // }, [authorizeSlotToSuccess, preBid]);

  useEffect(() => {
    if (approveSuccess) {
      console.log('bid: pre bid direct');
      preBid?.();
    }
  }, [approveSuccess, preBid]);


  useEffect(() => {
    if (bidPreparedEvent && bidPreparedEvent.bidder) {
      // todo: create adMeta
      console.log('bid prepare event done. create bid now...');
      createBid(
        imAccount?.id ?? '26',
        1,
        EIP5489ForInfluenceMiningContractAddress,
        tokenId,
        inputFloatStringToAmount('10')
      ).then((bidWithSig) => {
        console.log('create bid got sig', bidWithSig);
        setBidWithSig(bidWithSig);
      });
    }
  }, [bidPreparedEvent, tokenId, imAccount?.id]);

  useEffect(() => {
    if (bidWithSig && commitBidReady) {
      console.log(33333);
      commitBid?.();
    }
  }, [bidWithSig, commitBid, commitBidReady]);

  // useEffect(() => {
  //   if (preBidPrepareError) {
  //     console.log('prebid prepare error', preBidPrepareError);
  //   }
  // }, [preBidPrepareError]);

  useEffect(() => {
    if (commitBidSuccess) {
      // todo: refresh and clear state
      setBidLoading(false);
      message.success('commit bid success!!');
    }
  }, [commitBidSuccess]);

  const onFinish = (values: any) => {
    form.validateFields().then(async (values: any) => {
      setBidLoading(true);
      const { bid_price } = values;
      uploadIPFS(mockAdData).then((res) => {
        console.log('upload ipfs res', res);
        // success && blance >= approve amount = min_deposite_amount + new_bid_price
        if (res && Number(nftBalance) > MIN_DEPOIST_FOR_PRE_BID + bid_price) {
          approve?.();
        }
        setAdMetadataUrl(`https://ipfs.parami.io/ipfs/${res.Hash}`);
        console.log('bid: handle bid');
      });
    });
  };

  const handleBeforeUpload = (imageType: IMAGE_TYPE) => {
    return async (file: any) => {
      return await compressImageFile(file, imageType);
    };
  };

  const handleUploadOnChange = (imageType: IMAGE_TYPE) => {
    return (info: any) => {
      const { fileList } = info;
      if (info.file.status === 'done') {
        const ipfsHash = info.file.response.Hash;
        const imageUrl = 'https://ipfs.parami.io/ipfs/' + ipfsHash;
        fileList[0].url = imageUrl;
      }
      if (info.file.status === 'error') {
        message.error('Upload Image Error');
      }
      console.log('upload done', fileList);
      imageType === IMAGE_TYPE.POSTER
        ? setPosterUploadFiles(fileList)
        : setIconUploadFiles(fileList);
    };
  };

  if (!hnftAddress || !tokenId) {
    message.error('Invalid URL');
    return null;
  }

  return (
    <div className={styles.bidAdContainer}>
      <div className='ad-header'>
        <div>Bid on HNFT</div>
        <span>Place your advertisement on HNFTs</span>
      </div>
      <Form
        form={form}
        layout='vertical'
        autoComplete='off'
        initialValues={{ remember: true }}
      >
        <div className='ad-content'>
          <div className='ad-form'>
            <div className='title'>Config your Ad</div>
            <Form.Item
              name='title'
              label='Content'
              required
              rules={[{ required: true, message: 'Please input content!' }]}
            >
              <Input className='ad-form-item' bordered={false} />
            </Form.Item>
            <Form.Item
              name='icon'
              label='Ad icon'
              required
              rules={[{ required: true, message: 'Please upload icon!' }]}
            >
              <Upload
                {...uploadProps}
                fileList={iconUploadFiles}
                listType='picture'
                onChange={handleUploadOnChange(IMAGE_TYPE.ICON)}
                beforeUpload={handleBeforeUpload(IMAGE_TYPE.ICON)}
              >
                <Button icon={<UploadOutlined />} className='ad-form-upload'>
                  Click to Upload
                </Button>
              </Upload>
            </Form.Item>
            <Form.Item
              name='poster'
              label='Poster'
              required
              rules={[{ required: true, message: 'Please upload poster!' }]}
            >
              <Upload
                {...uploadProps}
                fileList={posterUploadFiles}
                listType='picture'
                onChange={handleUploadOnChange(IMAGE_TYPE.POSTER)}
                beforeUpload={handleBeforeUpload(IMAGE_TYPE.POSTER)}
              >
                <Button icon={<UploadOutlined />} className='ad-form-upload'>
                  Click to Upload
                </Button>
              </Upload>
            </Form.Item>
            <Form.Item
              name='tag'
              label='Tag'
              required
              rules={[{ required: true, message: 'Please select tag!' }]}
            >
              <Select
                size='large'
                style={{
                  width: '100%',
                }}
                popupClassName={styles.lifetimePopup}
                className='ad-form-item'
              >
                <Option value='nft'>NFT</Option>
                <Option value='twitter'>Twitter</Option>
                <Option value='deFi'>DeFi</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name='score'
              label='Score'
              required
              rules={[{ required: true, message: 'Please input score!' }]}
            >
              <InputNumber
                min={1}
                max={100}
                className='ad-form-item'
                bordered={false}
              />
            </Form.Item>
            <Form.Item
              name='url'
              label='Link'
              required
              rules={[{ required: true, message: 'Please input link!' }]}
            >
              <Input className='ad-form-item' bordered={false} />
            </Form.Item>
            <Collapse ghost>
              <Panel header='Advanced Settings' key='1'>
                <Form.Item
                  name='reward_rate_in_100_percent'
                  label='Reward Rate'
                  required
                  rules={[
                    { required: true, message: 'Please input reward rate!' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    className='ad-form-item'
                    bordered={false}
                  />
                </Form.Item>
                <Form.Item
                  name='lifetime'
                  label='lifetime'
                  required
                  rules={[
                    { required: true, message: 'Please select lifetime!' },
                  ]}
                >
                  <Select
                    size='large'
                    style={{
                      width: '100%',
                    }}
                    popupClassName={styles.lifetimePopup}
                    className='ad-form-item'
                  >
                    <Option value={1}>1 DAY</Option>
                    <Option value={3}>3 DAYS</Option>
                    <Option value={7}>7 DAYS</Option>
                    <Option value={15}>15 DAYS</Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name='payout_base'
                  label='Payout Base'
                  required
                  rules={[
                    { required: true, message: 'Please input payout base!' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    className='ad-form-item'
                    bordered={false}
                  />
                </Form.Item>
                <Form.Item
                  name='payout_min'
                  label='Payout Min'
                  required
                  rules={[
                    { required: true, message: 'Please input payout min!' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    className='ad-form-item'
                    bordered={false}
                  />
                </Form.Item>
                <Form.Item
                  name='payout_max'
                  label='Payout Max'
                  required
                  rules={[
                    { required: true, message: 'Please input payout max!' },
                  ]}
                >
                  <InputNumber
                    min={0}
                    max={100}
                    className='ad-form-item'
                    bordered={false}
                  />
                </Form.Item>
              </Panel>
            </Collapse>
          </div>
          <div className='ad-preview'>
            <div className='title'>Ad Preview</div>
            <div className='content'>
              <div className='header'>
                <UserAvatar
                  src={iconUploadFiles?.[0]?.url || ''}
                  className='avatar'
                />
                <div className='sponsor-desc'>
                  <span>is sponsoring this hNFT. </span>
                  <a className='bidLink' href='#' target='_blank'>
                    Bid on this ad space
                  </a>
                </div>
              </div>
              <div className='section'>
                <div className='arrow'></div>
                <div className='ad-title' title={content}>
                  {content}
                </div>
                <div className='ad-poster'>
                  <img
                    src={
                      posterUploadFiles?.[0]?.url ||
                      '/assets/images/rare_wall_bg.png'
                    }
                    referrerPolicy='no-referrer'
                    alt=''
                  ></img>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='ad-footer'>
          <div className='title'>Bid your price</div>
          <div className='bid-nfts'>
            <div className='bid-nfts-title'>Nfts</div>
            <div className='bid-nfts-content'>
              <div className='bid-nfts-content-header'>
                <div className='bid-nfts-content-header-item'>HNFT</div>
                <div className='bid-nfts-content-header-item'>Min Price</div>
                <div className='bid-nfts-content-header-item'>
                  Offer a price
                </div>
              </div>
              <div className='bid-nfts-content-body'>
                <div className='bid-nfts-content-body-item'>{hnft?.name}</div>
                <div className='bid-nfts-content-body-item'>{currentPrice}</div>
                <div className='bid-nfts-content-body-item'>
                  <Form.Item
                    name='bid_price'
                    required
                    rules={[{ required: true, message: 'Please input price!' }]}
                  >
                    <InputNumber
                      min={minPrice}
                      max={1000000}
                      className='bid-nfts-body-input'
                      bordered={false}
                    />
                  </Form.Item>
                </div>
              </div>
            </div>
            <div className='bid-nfts-footer'>
              <Button
                type='primary'
                shape='round'
                htmlType='submit'
                className='bid-nfts-footer-btn'
                onClick={onFinish}
                loading={bidLoading}
              >
                Bid
              </Button>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
};

export default BidHNFT;
