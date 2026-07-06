var GITEE_API = 'https://gitee.com/api/v5';

// ===== Gitee 配置（只需在此处修改，无需在前端输入） =====
// 私人令牌：Gitee → 设置 → 私人令牌 中生成
var GITEE_TOKEN = 'a207949f9c164a99357ce1e6a1913b1e';
// 仓库地址：HTTPS 格式的 Gitee 仓库地址
var GITEE_REPO_URL = 'https://gitee.com/hesir00/quick-tools-warehouse.git';

function encodeBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64(b64) {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function cleanBase64(b64) {
  return b64.replace(/\s/g, '').replace(/\n/g, '').replace(/\r/g, '');
}

async function apiLog(label, url, options) {
  console.log('[API]', label, '→', url.replace(/access_token=[^&]+/, 'access_token=***'));
  try {
    const res = await fetch(url, options);
    console.log('[API]', label, '← HTTP', res.status);
    return res;
  } catch (err) {
    console.error('[API]', label, '✗ NETWORK ERROR:', err.message);
    throw err;
  }
}

class GiteeClient {
  constructor(token, owner, repo, branch) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch || 'master';
  }

  async getFile(path) {
    const url = `${GITEE_API}/repos/${this.owner}/${this.repo}/contents/${path}?access_token=${this.token}&ref=${this.branch}`;
    const res = await apiLog('getFile', url);
    if (res.status === 404) {
      console.log('[API] getFile → 404, 文件不存在');
      return null;
    }
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = res.status;
      try { const j = JSON.parse(errText); errMsg = j.message || j.error || errText; } catch(e) { errMsg = errText; }
      throw new Error('获取文件失败(' + res.status + '): ' + errMsg);
    }
    const data = await res.json();
    if (Array.isArray(data) || !data.content) {
      console.log('[API] getFile → 返回非文件数据(空数组或目录), 视为不存在');
      return null;
    }
    const result = {
      content: decodeBase64(data.content),
      sha: data.sha
    };
    console.log('[API] getFile → 成功, sha:', data.sha, 'content长度:', result.content.length);
    return result;
  }

  async createFile(path, content, message, isRawBase64) {
    const url = `${GITEE_API}/repos/${this.owner}/${this.repo}/contents/${path}`;
    let encodedContent;
    if (isRawBase64) {
      encodedContent = cleanBase64(content);
    } else {
      encodedContent = encodeBase64(content);
    }
    const body = JSON.stringify({
      access_token: this.token,
      content: encodedContent,
      message: message || 'create file',
      branch: this.branch
    });
    console.log('[API] createFile body size:', Math.round(body.length / 1024) + 'KB');
    const res = await apiLog('createFile(' + path + ')', url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = res.status;
      try { const j = JSON.parse(errText); errMsg = j.message || j.error || errText; } catch(e) { errMsg = errText; }
      throw new Error('创建文件失败(' + res.status + '): ' + errMsg);
    }
    const result = await res.json();
    console.log('[API] createFile → 成功, commit:', (result.commit && result.commit.sha) || 'unknown');
    return result;
  }

  async updateFile(path, content, sha, message) {
    const url = `${GITEE_API}/repos/${this.owner}/${this.repo}/contents/${path}`;
    const encodedContent = encodeBase64(content);
    const body = JSON.stringify({
      access_token: this.token,
      content: encodedContent,
      sha: sha,
      message: message || 'update file',
      branch: this.branch
    });
    console.log('[API] updateFile body size:', Math.round(body.length / 1024) + 'KB, sha:', sha);
    const res = await apiLog('updateFile(' + path + ')', url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = res.status;
      try { const j = JSON.parse(errText); errMsg = j.message || j.error || errText; } catch(e) { errMsg = errText; }
      throw new Error('更新文件失败(' + res.status + '): ' + errMsg);
    }
    const result = await res.json();
    console.log('[API] updateFile → 成功, new sha:', (result.content && result.content.sha) || 'unknown');
    return result;
  }

  async deleteFile(path, sha, message) {
    const url = `${GITEE_API}/repos/${this.owner}/${this.repo}/contents/${path}`;
    const res = await apiLog('deleteFile(' + path + ')', url, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: this.token,
        sha: sha,
        message: message || 'delete file',
        branch: this.branch
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      let errMsg = res.status;
      try { const j = JSON.parse(errText); errMsg = j.message || j.error || errText; } catch(e) { errMsg = errText; }
      throw new Error('删除文件失败(' + res.status + '): ' + errMsg);
    }
    return res.json();
  }

  getRawUrl(path) {
    return `https://gitee.com/${this.owner}/${this.repo}/raw/${this.branch}/${path}`;
  }
}