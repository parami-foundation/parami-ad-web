import React, { useEffect } from 'react';
import { Layout, notification } from 'antd';
import './Home.scss';
import HomePageHeader from '../../components/HomePageHeader/HomePageHeader';
import { Outlet } from 'react-router-dom';
import { parseUrlParams } from '../../utils/window.util';
import { createAccountOrLogin } from '../../services/mining.service';
import MyNFT from '../../components/MyNFT/MyNFT';

const { Content } = Layout;

export interface HomeProps { }

function Home({ }: HomeProps) {

    useEffect(() => {
        const params = parseUrlParams() as { code: string, state: string };
        if (params.code) {
            createAccountOrLogin(params.code).then(res => {
                if (res.success) {
                    notification.success({
                        message: 'Login Successful!'
                    })
                    const tag = params.state && params.state.startsWith('tag_') ? params.state.slice(4) : null;
                    window.location.href = `${window.location.origin}/#/miner${tag ? `?tag=${tag}` : ''}`;
                    // navigate('/miner');
                    return;
                }

                if (res.status === 403) {
                    notification.warning({
                        message: 'Please Apply for Beta Access'
                    });
                    setTimeout(() => {
                        // navigate('/');
                        window.location.href = `${window.location.origin}`;
                    }, 1000);
                    return;
                }

                notification.warning({
                    message: res.message
                });
                window.location.href = `${window.location.origin}`;
            });
        }
    }, []);

    return <>
        <Layout className='layout-container'>
            <HomePageHeader />
            <MyNFT></MyNFT>
            <Content className='layout-content-container'>
                <Outlet></Outlet>
            </Content>
            {/* <Footer className='layout-footer'>
                <div className='footer-content'>
                    <div className='info'>Powered by GPT-3.5</div>

                    {!isMobile && <>
                        <div className='tweet-hint'>
                            Post a tweet with <span className='tag'>{OFFICIAL_TAG}</span> and start earning
                            <div className='action-btn-primary active' onClick={() => {
                                setGenerateTweetModal(true);
                            }}>Tweet</div>
                        </div>
                    </>}

                    {isMobile && <>
                        <div className='tweet-hint'>
                            Post a tweet with <span className='tag'>{OFFICIAL_TAG}</span> and start earning
                        </div>
                        <div className='action-btn-primary active' onClick={() => {
                            setGenerateTweetModal(true);
                        }}>Tweet</div>
                    </>}
                </div>
            </Footer> */}
        </Layout>
    </>;
};

export default Home;
