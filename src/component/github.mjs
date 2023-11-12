import { Octokit } from "@octokit/rest";

const mapfile_path = ".sync/mapping.json";
const blog_repo = "han-0315.github.io";
const post_base_path = "_posts";
const owner = "han-0315";
import moment from 'moment-timezone';

export default class Github {
    octokit;
    mapping_file;
    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
    }
    async update_mapping(pageid, post_title) {
        let mappingFileContent = JSON.parse(this.mapping_file);
        const date = moment().tz("Asia/Seoul").format('YYYY-MM-DD');

        const newContent = {
            "id": pageid,
            "update_date": date,
            "post_title": post_title
        };

        mappingFileContent.push(newContent);
        const updatedContentString = JSON.stringify(mappingFileContent, null, 2); // 2는 들여쓰기를 위한 것입니다
        const base64Content = Buffer.from(updatedContentString).toString('base64');


        const { data } = await this.octokit.repos.getContent({
            owner: owner,
            repo: blog_repo,
            path: mapfile_path
        });
        const sha = data.sha


        try {
            const result = await this.octokit.repos.createOrUpdateFileContents({
                owner: owner,
                repo: blog_repo,
                path: mapfile_path,
                message: `Update mapping file: ${pageid}`,
                content: base64Content,
                sha: sha
            });
            if (!result || result.status !== 200) {
                throw new Error("Failed to update the mapping file on GitHub.");
            }
        } catch (error) {
            console.error("Error:", error);
            throw error;
        }
    }
    async post_upload(base64Content, post_title, pageid) {
        // mapping.json에서 정보 가져오기
        try {
            // GitHub에서 파일 내용 가져오기
            const response = await this.octokit.repos.getContent({
                owner: owner,
                repo: blog_repo,
                path: mapfile_path
            });
            // Base64로 인코딩된 내용을 디코딩
            this.mapping_file = Buffer.from(response.data.content, 'base64').toString('utf8');
            const items = JSON.parse(this.mapping_file);

            // ID가 일치하는 아이템 찾기
            const foundItem = items.find(item => item.id === pageid);
            console.log(foundItem);

            if (foundItem == undefined) {
                console.log("Create Post");
                await this.post_create(base64Content, post_title, pageid);
            }
            else {
                console.log("Update Post");
                await this.post_update(base64Content, foundItem.post_title);
            }


        } catch (error) {
            console.error('Error fetching file from GitHub or parsing its content:', error);
        }
    }

    async update(githubRepo, githubPath, base64Content) {

        const { data } = await this.octokit.repos.getContent({
            owner: owner,
            repo: githubRepo,
            path: githubPath
        });
        const sha = data.sha;

        try {
            const result = await this.octokit.repos.createOrUpdateFileContents({
                owner: owner,
                repo: githubRepo,
                path: githubPath,
                message: `Update from Notion: ${githubPath}`,
                content: base64Content,
                sha: sha
            });
            if (!result || result.status !== 200) {
                throw new Error("Failed to update the file on GitHub.");
            }
        } catch (error) {
            console.error("Error update from GitHub:", error);
            throw error;
        }


    }


    async create(githubRepo, githubPath, base64Content) {
        const result = await this.octokit.repos.createOrUpdateFileContents({
            owner: owner,
            repo: githubRepo,
            path: githubPath,
            message: `Create from Notion: ${githubPath}`,
            content: base64Content,
        });
        if (!result || result.status !== 201) { // 생성 시 HTTP = 201
            throw new Error("Failed to create the file on GitHub.");
        }
    }

    async upload(base64Content, githubRepo, githubPath) {
        // 유효성 검사 GitHub PATH
        try {
            await this.octokit.repos.getContent({
                owner: owner,
                repo: githubRepo,
                path: githubPath
            });
            // GitHub Path가 이미존재
            console.log("GitHub Path already exists. Update File");
            this.update(githubRepo, githubPath, base64Content);
        } catch (error) {
            if (error.status !== 404) {
                throw new Error("Error checking the GitHub Path. Please try again.");
            }
            console.log("GitHub Path not exists. Create File");
            this.create(githubRepo, githubPath, base64Content);
        }
    }
    async post_create(base64Content, post_title, page_id) {
        // 현재 날짜
        const date = moment().tz("Asia/Seoul").format('YYYY-MM-DD');
        const post_full_title = `${date}-${post_title}`;
        const post_path = `${post_base_path}/${post_full_title}.md`;
        // 블로그 업로드
        await this.create(blog_repo, post_path, base64Content);
        // mapping.json에 정보 추가 
        await this.update_mapping(page_id, post_full_title);
    }
    async post_update(base64Content, post_title) { // 기존에 있는 포스트 이름이 파라미터로 옴
        const post_path = `${post_base_path}/${post_title}.md`;
        this.update(blog_repo, post_path, base64Content);
    }
}