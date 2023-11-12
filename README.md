
## 프로젝트
노션의 페이지를 추출하여, GitHub에 업로드하는 프로젝트입니다. 깃허브 블로그를 운영하면서, 노션에 있는 정보를 깃허브에 업로드하는 과정을 자동화하기 위해 만들었습니다.
AWS SAM을 이용한 서비리스 방식으로 작동합니다. 노션에의 데이터베이스에 있는 링크를 클릭하면, 람다가 호출되고 해당 페이지를 깃허브에 업로드를 진행합니다.

#### 참고 목록
- [깃허브 API](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#create-or-update-file-contents)
- [노션 시크릿 API 정보](https://github.com/darobin/notion-backup/tree/main)


#### 사용한 프레임워크
- API Gateway, Lambda, SAM CLI
- javascript(notion-to-md, @notionhq/client[노션], @octokit/rest[깃허브])



### GitHub Blog 이용
- PageID와 GitHub Blog 포스팅 이름을 GitHub에 저장하여 맵핑
  - PageID가 이미 존재하면, Update
  - 없다면, 최초 업로드 -> 현재 날짜로 업로드
- 노션의 Page ID는 페이지의 위치를 변경해도 변하지 않음
- API 게이트웨이를 통해 받는 PATH는 아래와 같음
  - PATH = {pageid}/{title}   
  - title에서 공백은 '-'로 노션에서 입력해줘야 한다.