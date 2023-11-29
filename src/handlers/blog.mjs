import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import Github from "../component/github.mjs";
import axios from "axios";
import fs from "fs";
import os from "os";
const notion = new Client({
    auth: process.env.NOTION_SECRET_API_KEY,
});
// notion to markdown
const image_base_path = "/assets/img/post";
const n2m = new NotionToMarkdown({ notionClient: notion });
const github = new Github({});
let imageMapping = [];
let filePaths = [];

export const Handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        throw new Error(`getAllItems only accept GET method, you tried: ${event.httpMethod}`);
    }

    console.info('received:', event);

    const pageId = event.pathParameters.pageid;
    const post_title = decodeURIComponent(event.pathParameters.title);

    // 유효성 검사 PageID
    try {
        await notion.pages.retrieve({ page_id: pageId });
    } catch (error) {
        throw new Error("Invalid Notion PageID or the page does not exist.");
    }
    // Notion에서 데이터 추출
    const mdblocks = await n2m.pageToMarkdown(pageId);
    let mdString = n2m.toMarkdownString(mdblocks);

    // Notion에서 추출한 데이터 앞에 있는 개행문자 제거 -> layout 형식을 위해
    mdString = mdString.parent.replace(/^\n+/g, '');
    // Image URL에서 쿼리 파라미터 제거
    mdString = mdString.replace(/(\.png|\.(jpe?g|gif|bmp|tiff))(\?.*?)?(?=\)|$)/g, "$1");

    const tempdir = os.tmpdir();
    imageMapping = await downloadImagesFromPage(pageId, tempdir);
    console.log("Download Image Complete");

    // mdString 문자열 내부 image url을 image name으로 변경
    imageMapping.forEach(({ imageUrl, ImageN }) => {
        // 쿼리 파라미터 이전까지의 URL 부분 추출
        const baseUrl = imageUrl.split('?')[0];
        const imagePath = image_base_path + "/" + post_title + "/" + ImageN;
        // 마크다운 문자열 내의 URL을 imagePath 변경
        filePaths = filePaths.concat([tempdir + "/" + ImageN]);
        mdString = mdString.replace(new RegExp(baseUrl, 'g'), imagePath);
    });
    const mdPath = tempdir + "/" + post_title + ".md";
    fs.writeFileSync(mdPath, mdString);
    filePaths = filePaths.concat([mdPath]);
    await github.post_upload(filePaths, post_title, pageId);

    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: `Success! Received pageId: ${pageId} and post_title: ${post_title}`
        })
    };

    // All log statements are written to CloudWatch
    console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
    return response;
}


async function downloadImagesFromPage(pageId, basepath) {

    const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 50,
    });
    let id = 1;
    let localImageMapping = [];
    for (const block of response.results) {
        if (block.type === 'image') {

            const imageUrl = block.image.file.url; // 혹은 block.image.external.url;
            const extensionMatch = imageUrl.match(/\.(png|jpg|jpeg|gif|bmp|tiff)(?=\?|$)/);
            const ImageN = id + extensionMatch[0];
            localImageMapping.push({ imageUrl, ImageN });
            await downloadImage(imageUrl, basepath + "/" + ImageN);
            id = id + 1;
        }
    }
    return localImageMapping;
}


async function downloadImage(imageUrl, imagePath) {
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

