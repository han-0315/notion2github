import { Octokit } from "@octokit/rest";
import fs from 'fs';
import path from 'path';
const mapfile_path = ".sync/mapping.json";
const repo = "han-0315.github.io";
const post_base_path = "_posts";
const image_base_path = "assets/img/post";
const owner = "han-0315";
const branch = "main";
import moment from 'moment-timezone';

// 기본정보

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
        const updatedContentString = JSON.stringify(mappingFileContent, null, 2);
        const base64Content = Buffer.from(updatedContentString).toString('base64');

        await this.pushGitHub({
            owner: owner,
            repo: repo,
            path: mapfile_path,
            message: `Update mapping file: ${pageid}`,
            content: base64Content
        })


    }


    async post_upload(filepaths, post_title, pageid) {
        try {
            // GitHub에서 파일 내용 가져오기
            const response = await this.octokit.repos.getContent({
                owner: owner,
                repo: repo,
                path: mapfile_path
            });
            // Base64로 인코딩된 내용을 디코딩
            this.mapping_file = Buffer.from(response.data.content, 'base64').toString('utf8');
            const items = JSON.parse(this.mapping_file);

            // ID가 일치하는 아이템 찾기
            const foundItem = items.find(item => item.id === pageid);


            if (foundItem == undefined) {
                console.log("Create Post");
                await this.post_create(filepaths, post_title, pageid);
            }
            else {
                console.log("Update Post");
                await this.post_update(filepaths, foundItem.post_title);
            }


        } catch (error) {
            console.error('Error fetching file from GitHub or parsing its content:', error);
        }
    }



    async pushGitHub(action) {
        try {
            const predContent = await this.octokit.repos.getContent({
                owner: owner,
                repo: repo,
                path: action.path
            });
            if (predContent.status === 200) {
                // 파일이 존재하면 sha를 action 객체에 추가
                action.sha = predContent.data.sha;
            }
            console.log("File found on GitHub Update File.");
        } catch (error) {
            console.log("File not found on GitHub. Creating a new file.");
        }
        try {
            const result = await this.octokit.repos.createOrUpdateFileContents(action);
            if (!result || (result.status !== 200 && result.status !== 422)) {
                throw new Error("Failed to update the file on GitHub.");
            }
        } catch (error) {
            console.error("Error while pushing to GitHub:", error);
        }

    }

    async post_create(filepaths, post_title, page_id) {
        // 현재 날짜
        const date = moment().tz("Asia/Seoul").format('YYYY-MM-DD');
        const post_full_title = `${date}-${post_title}`;
        const post_path = `${post_base_path}/${post_full_title}.md`;
        const image_path = `${image_base_path}/${post_title}`;
        const actions = filepaths.map(filepath => {
            if (filepath.endsWith('.md')) {
                return {
                    owner: owner,
                    repo: repo,
                    path: post_path,
                    message: `Create Post: ${post_full_title}`,
                    content: fs.readFileSync(filepath, 'base64'),
                };
            }
            else {
                // 이미지 파일
                return {
                    owner: owner,
                    repo: repo,
                    path: image_path + "/" + path.basename(filepath),
                    message: `Create Image: ${path.basename(filepath)}`,
                    content: fs.readFileSync(filepath, 'base64')
                };
            }

        });

        for (const action of actions) { // forEach 대신 for...of 사용
            console.log("Process: " + action.path);
            await this.pushGitHub(action);
        }
        // mapping.json에 정보 추가 
        await this.update_mapping(page_id, post_full_title);
    }

    async post_update(filepaths, post_title) { // 기존에 있는 포스트 이름이 파라미터로 옴
        const post_path = `${post_base_path}/${post_title}.md`;
        const post_base = post_title.substring(11);
        const image_path = `${image_base_path}/${post_base}`;


        const actions = filepaths.map(filepath => {
            if (filepath.endsWith('.md')) {
                return {
                    owner: owner,
                    repo: repo,
                    path: post_path,
                    message: `Update Post: ${post_title}`,
                    content: fs.readFileSync(filepath, 'base64')

                };
            }
            else {
                // 이미지 파일
                return {
                    owner: owner,
                    repo: repo,
                    path: image_path + "/" + path.basename(filepath),
                    message: `Update Image: ${path.basename(filepath)}`,
                    content: fs.readFileSync(filepath, 'base64')

                };
            }

        });

        for (const action of actions) { // forEach 대신 for...of 사용
            console.log("Process: " + action.path);
            await this.pushGitHub(action);
        }

    }


}