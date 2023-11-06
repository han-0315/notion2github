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


    const pageId = event.pathParameters.pageid;
    const githubRepo = decodeURIComponent(event.pathParameters.repo);
    const githubPath = decodeURIComponent(event.pathParameters.path);

    // 유효성 검사 PageID
    try {
        await notion.pages.retrieve({ page_id: pageId });
    } catch (error) {
        throw new Error("Invalid Notion PageID or the page does not exist.");
    }

    // Notion에서 데이터 추출
    const mdblocks = await n2m.pageToMarkdown(pageId);
    const mdString = n2m.toMarkdownString(mdblocks);

    // GitHub에 업로드
    const base64Content = Buffer.from(mdString.parent).toString("base64");
    await github.upload(base64Content, githubRepo, githubPath);

    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: `Received pageId: ${pageId} and githubPath: ${githubPath}`
        })
    };

    // All log statements are written to CloudWatch
    console.info(`response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`);
    return response;
}


