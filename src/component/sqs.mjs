import AWS from 'aws-sdk';
const sqs = new AWS.SQS({ apiVersion: '2012-11-05', region: 'ap-northeast-2' });
const delaySeconds = 180; // 인덱싱 작업 딜레이 시간을 3분으로 설정
const base_url = 'https://www.handongbee.com/posts/';

export default class SQShanlder {
    queueUrl
    constructor(queueUrl) {
        this.queueUrl = queueUrl;
    }
    async sendMessage(post_title) {
        post_title = encodeURIComponent(post_title.replace(/\s+/g, '-'));
        const params = {
            QueueUrl: this.queueUrl,
            MessageBody: base_url + post_title,
            DelaySeconds: delaySeconds
        };
        try {
            const result = await sqs.sendMessage(params).promise();
            console.log('Message sent successfully', result.MessageId);
        } catch (error) {
            console.error('Error sending message to SQS', error);
        }
    }
}

