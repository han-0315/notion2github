import { GoogleAuth } from 'google-auth-library';
import axios from 'axios'
import AWS from 'aws-sdk';

const SCOPES = ['https://www.googleapis.com/auth/indexing'];
const secretManager = new AWS.SecretsManager();


export default class GoogleSearch {
    constructor() {
    }
    async getSecret() {
        return new Promise((resolve, reject) => {
            secretManager.getSecretValue({
                SecretId: 'googleAPI'
            }, (err, data) => {
                if (err) {
                    console.error('SecretsManager Error:', err);
                    reject(err);
                } else {
                    if ('SecretString' in data) {
                        resolve(JSON.parse(data.SecretString));
                    } else {
                        const buff = Buffer.from(data.SecretBinary, 'base64');
                        resolve(JSON.parse(buff.toString('ascii')));
                    }
                }
            });
        });
    }

    async authenticate(post_title) {
        try {
            const secret = await this.getSecret();
            const auth = new GoogleAuth({
                credentials: secret,
                scopes: ['https://www.googleapis.com/auth/indexing'],
            });
            const client = await auth.getClient();
            const url = `https://indexing.googleapis.com/v3/urlNotifications:publish`;

            const data = {
                url: 'https://www.handongbee.com/posts/' + post_title,
                type: 'URL_UPDATED',
            };

            try {
                const response = await axios({
                    method: 'post',
                    url: url,
                    data: data,
                    headers: {
                        'Authorization': `Bearer ${(await client.getAccessToken()).token}`,
                        'Content-Type': 'application/json',
                    },
                });

                console.log('Response Data:', response.data);
            } catch (error) {
                if (error.response) {
                    // 요청이 이루어졌으나 서버가 2xx 범위가 아닌 상태 코드로 응답한 경우
                    console.error('Error Response:', error.response.data);
                    console.error('Status:', error.response.status);
                    console.error('Headers:', error.response.headers);
                } else if (error.request) {
                    // 요청이 이루어졌으나 응답을 받지 못한 경우
                    console.error('Error Request:', error.request);
                } else {
                    // 요청을 설정하는 동안에 발생한 에러
                    console.error('Error Message:', error.message);
                }
                console.error('Config:', error.config);
            }
        } catch (error) {
            console.error('Authentication Error:', error.message);
        }
    }
}



