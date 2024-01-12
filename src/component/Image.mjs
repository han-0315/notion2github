
import fs from 'fs';
import axios from 'axios';

export default class NotionImageDownloader {
    id = 1;
    localImageMapping = [];
    notionClient;
    constructor(notionClient) {
        this.notionClient = notionClient;
    }
    async downloadImagesFromPage(pageId, path) {
        const response = await this.notionClient.blocks.children.list({
            block_id: pageId,
            page_size: 100,
        });


        for (const block of response.results) {
            await this.processBlock(block, path);
        }

        return this.localImageMapping;
    }

    async processBlock(block, path) {
        if (block.type === 'image') {
            await this.downloadImageFromBlock(block, path);
        }

        if (block.has_children) {
            const childResponse = await this.notionClient.blocks.children.list({
                block_id: block.id,
                page_size: 100,
            });

            for (const childBlock of childResponse.results) {
                await this.processBlock(childBlock, path);
            }
        }
    }

    async downloadImageFromBlock(block, path) {
        const imageUrl = block.image.file?.url || block.image.external?.url;
        const extensionMatch = imageUrl.match(/\.(png|jpg|jpeg|gif|bmp|svg|tif|tiff|heic|avif|webp)(?=\?|$)/);


        if (extensionMatch) {
            const ImageN = this.id + extensionMatch[0];
            const imagePath = path + "/" + ImageN;
            this.localImageMapping.push({ imageUrl, ImageN });
            this.id++;
            await this.downloadImage(imageUrl, imagePath);
        }
    }
    async downloadImage(imageUrl, imagePath) {
        try {
            const response = await axios({
                method: 'GET',
                url: imageUrl,
                responseType: 'stream'
            });
            response.data.pipe(fs.createWriteStream(imagePath));

            return new Promise((resolve, reject) => {
                response.data.on('end', () => resolve());
                response.data.on('error', err => reject(err));
            });
        } catch (error) {
            console.error('이미지 다운로드 중 오류 발생:', error);
        }
    }
}




