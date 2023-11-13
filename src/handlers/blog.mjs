import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import Github from "../component/github.mjs";

const notion = new Client({
    auth: process.env.NOTION_SECRET_API_KEY,
});
// notion to markdown

const n2m = new NotionToMarkdown({ notionClient: notion });
const github = new Github({});


export const Handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        throw new Error(`getAllItems only accept GET method, you tried: ${event.httpMethod}`);
    }

    console.info('received:', event);
    //console.log(process.env.GITHUB_TOKEN);

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

    // GitHub에 업로드
    const base64Content = Buffer.from(mdString).toString("base64");

    await github.post_upload(base64Content, post_title, pageId);

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


