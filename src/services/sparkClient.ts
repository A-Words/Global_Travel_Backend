import WebSocket from 'ws';
import crypto from 'crypto';
import {logger} from '../config/logger';

export class SparkClient {
    private apiKey: string;
    private apiSecret: string;
    private appId: string;
    private version: string;
    private domain: string;

    constructor() {
        this.apiKey = process.env.SPARK_API_KEY!;
        this.apiSecret = process.env.SPARK_API_SECRET!;
        this.appId = process.env.SPARK_APP_ID!;
        this.version = process.env.SPARK_VERSION || 'v1.1';
        this.domain = process.env.SPARK_DOMAIN || 'general';

        if (!this.apiKey || !this.apiSecret || !this.appId) {
            throw new Error('星火大模型配置缺失，请检查环境变量');
        }
    }

    async chat(prompt: string): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                const ws = new WebSocket(this.getAuthUrl());
                let response = '';

                ws.on('open', () => {
                    const params = {
                        header: {
                            app_id: this.appId,
                            uid: 'user1'
                        },
                        parameter: {
                            chat: {
                                domain: this.domain,
                                temperature: 0.5,
                                max_tokens: 2048
                            }
                        },
                        payload: {
                            message: {
                                text: [{role: "user", content: prompt}]
                            }
                        }
                    };

                    ws.send(JSON.stringify(params));
                });

                ws.on('message', (data) => {
                    try {
                        const res = JSON.parse(data.toString());
                        if (res.header.code !== 0) {
                            ws.close();
                            reject(new Error(`星火API错误: ${res.header.message}`));
                            return;
                        }
                        if (res.payload.choices.text) {
                            response += res.payload.choices.text[0].content;
                        }
                        if (res.header.status === 2) {
                            ws.close();
                            resolve(response);
                        }
                    } catch (error) {
                        logger.error('解析星火响应失败:', error);
                        reject(error);
                    }
                });

                ws.on('error', (error) => {
                    logger.error('WebSocket连接错误:', error);
                    reject(error);
                });

                setTimeout(() => {
                    ws.close();
                    reject(new Error('连接星火服务超时'));
                }, 30000);

            } catch (error) {
                logger.error('创建WebSocket连接失败:', error);
                reject(error);
            }
        });
    }

    private getAuthUrl() {
        const host = 'spark-api.xf-yun.com';
        const date = new Date().toUTCString();
        const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /${this.version}/chat HTTP/1.1`;

        const signature = crypto
            .createHmac('sha256', this.apiSecret)
            .update(signatureOrigin)
            .digest('base64');

        const authorizationOrigin = `api_key="${this.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
        const authorization = Buffer.from(authorizationOrigin).toString('base64');

        return `wss://${host}/${this.version}/chat?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;
    }
}