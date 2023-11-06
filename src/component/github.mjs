import { Octokit } from "@octokit/rest";


export default class Github {
    octokit;
    // 길어지면, JSON 형식으로 관리
    owner = "han-0315";

    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
    }


    async update(githubRepo, githubPath, base64Content) {

        const { data } = await this.octokit.repos.getContent({
            owner: this.owner,
            repo: githubRepo,
            path: githubPath
        });
        const sha = data.sha;

        try {
            const result = await this.octokit.repos.createOrUpdateFileContents({
                owner: this.owner,
                repo: githubRepo,
                path: githubPath,
                message: `Sync with Notion: ${githubPath}`,
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
            owner: this.owner,
            repo: githubRepo,
            path: githubPath,
            message: `Sync with Notion: ${githubPath}`,
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
                owner: this.owner,
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
}