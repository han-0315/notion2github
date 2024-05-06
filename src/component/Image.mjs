
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
        let start_cursor = undefined;
        let hasMore = true;

        // 반복적으로 모든 페이지의 데이터를 요청
        while (hasMore) {
            const response = await this.notionClient.blocks.children.list({
                block_id: pageId,
                start_cursor: start_cursor,
                page_size: 100  // 한 페이지당 최대 block 수 설정
            });

            // 각 블록 처리
            for (const block of response.results) {
                await this.processBlock(block, path);
            }

            // start_cursor 업데이트
            start_cursor = response.next_cursor;
            hasMore = start_cursor != null;  // 다음 페이지가 있는지 확인
        }

        return this.localImageMapping;
    }

    async processBlock(block, path) {
        if (block.type === 'image') {
            console.log(block.image.file.url)
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
            await response.data.pipe(fs.createWriteStream(imagePath));

            return new Promise((resolve, reject) => {
                response.data.on('end', () => resolve());
                response.data.on('error', err => reject(err));
            });
        } catch (error) {
            console.error('이미지 다운로드 중 오류 발생:', error);
        }
    }
    async deleteImages(filePaths) {
        filePaths.forEach((filePath) => {
            try {
                fs.unlinkSync(filePath);
                console.log(`Deleted: ${filePath}`);
            } catch (err) {
                console.error(`Error deleting ${filePath}: ${err}`);
            }
        });
    }



}
