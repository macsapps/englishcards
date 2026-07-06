var client = null;
var cards = [];
var editingCard = null;
var editingImages = [];
var toastTimer = null;

var DATA_FILE = 'data/words.json';
var IMAGE_DIR = 'images';

function init() {
  loadConfig();
  bindEvents();
  if (client) {
    loadCards();
  } else {
    showModal('configModal');
  }
}

function parseRepoUrl(url) {
  url = url.trim().replace(/\.git$/, '');
  var match = url.match(/gitee\.com\/([^\/]+)\/([^\/\?#]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

function loadConfig() {
  var token = localStorage.getItem('gitee_token');
  var repoUrl = localStorage.getItem('gitee_repo_url');

  if (token && repoUrl) {
    document.getElementById('cfgToken').value = token;
    document.getElementById('cfgRepoUrl').value = repoUrl;
    var parsed = parseRepoUrl(repoUrl);
    if (parsed) {
      client = new GiteeClient(token, parsed.owner, parsed.repo, 'master');
    }
  }
}

function bindEvents() {
  document.getElementById('btnConfig').onclick = function () { showModal('configModal'); };
  document.getElementById('btnSaveConfig').onclick = saveConfig;
  document.getElementById('btnTestConn').onclick = testConnection;
  document.getElementById('btnNew').onclick = function () { openEditModal(null); };
  document.getElementById('btnRefresh').onclick = loadCards;
  document.getElementById('btnSaveCard').onclick = saveCard;
  document.getElementById('btnAddWord').onclick = function () { addWordRow(null); };
  document.getElementById('btnBatchParse').onclick = batchParseWords;
  document.getElementById('btnBatchClear').onclick = function () {
    document.getElementById('batchInput').value = '';
  };

  var closeBtns = document.querySelectorAll('[data-close]');
  for (var i = 0; i < closeBtns.length; i++) {
    closeBtns[i].onclick = function () { closeModal(this.getAttribute('data-close')); };
  }

  var overlays = document.querySelectorAll('.modal-overlay');
  for (var j = 0; j < overlays.length; j++) {
    overlays[j].onclick = function (e) {
      if (e.target === this) closeModal(this.id);
    };
  }

  document.getElementById('editImages').onchange = handleImageSelect;
}

function showCfgStatus(type, msg) {
  var el = document.getElementById('cfgStatus');
  el.className = 'cfg-status show ' + type;
  el.textContent = msg;
}

function clearCfgStatus() {
  var el = document.getElementById('cfgStatus');
  el.className = 'cfg-status';
  el.textContent = '';
}

async function testConnection() {
  var token = document.getElementById('cfgToken').value.trim();
  var repoUrl = document.getElementById('cfgRepoUrl').value.trim();

  if (!token) {
    showCfgStatus('error', '❌ 请输入私人令牌');
    return;
  }
  if (!repoUrl) {
    showCfgStatus('error', '❌ 请输入仓库地址');
    return;
  }

  var parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    showCfgStatus('error', '❌ 仓库地址格式无法解析，请确认是 Gitee 仓库地址');
    return;
  }

  showCfgStatus('loading', '🔌 正在验证连接...');

  try {
    var testClient = new GiteeClient(token, parsed.owner, parsed.repo, 'master');
    var url = GITEE_API + '/repos/' + parsed.owner + '/' + parsed.repo + '?access_token=' + token;
    var res = await fetch(url);

    if (res.ok) {
      var data = await res.json();
      var branch = data.default_branch || 'master';
      showCfgStatus('success', '✅ 连接成功！仓库: ' + data.full_name + ' | 默认分支: ' + branch);
      return branch;
    } else if (res.status === 401) {
      showCfgStatus('error', '❌ 私人令牌无效或已过期');
    } else if (res.status === 404) {
      showCfgStatus('error', '❌ 仓库不存在或令牌无访问权限');
    } else {
      var errBody = await res.json().catch(function () { return {}; });
      showCfgStatus('error', '❌ 连接失败: ' + (errBody.message || res.status));
    }
  } catch (err) {
    showCfgStatus('error', '❌ 网络错误: ' + err.message);
  }
  return null;
}

function saveConfig() {
  var token = document.getElementById('cfgToken').value.trim();
  var repoUrl = document.getElementById('cfgRepoUrl').value.trim();

  if (!token || !repoUrl) {
    showToast('请填写完整配置信息');
    return;
  }

  var parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    showToast('仓库地址格式无法解析');
    return;
  }

  localStorage.setItem('gitee_token', token);
  localStorage.setItem('gitee_repo_url', repoUrl);

  client = new GiteeClient(token, parsed.owner, parsed.repo, 'master');
  clearCfgStatus();
  closeModal('configModal');
  showToast('配置已保存');
  loadCards();
}

async function loadCards() {
  if (!client) {
    showModal('configModal');
    return;
  }

  document.getElementById('loadingTip').style.display = 'block';
  document.getElementById('emptyTip').style.display = 'none';
  document.getElementById('cardList').innerHTML = '';

  try {
    var file = await client.getFile(DATA_FILE);
    console.log('[加载] getFile 结果:', file ? '有数据, sha=' + file.sha : '文件不存在(新仓库)');
    if (file) {
      cards = JSON.parse(file.content);
      if (!Array.isArray(cards)) cards = [cards];
    } else {
      cards = [];
    }
    renderCards();
  } catch (err) {
    console.error('[加载] 失败:', err);
    showToast('加载失败: ' + err.message);
    cards = [];
    renderCards();
  }
}

function renderCards() {
  document.getElementById('loadingTip').style.display = 'none';
  var list = document.getElementById('cardList');

  if (cards.length === 0) {
    document.getElementById('emptyTip').style.display = 'block';
    return;
  }

  document.getElementById('emptyTip').style.display = 'none';

  var html = '';
  for (var i = 0; i < cards.length; i++) {
    var card = cards[i];
    var imgHtml = '';
    if (card.images && card.images.length > 0) {
      imgHtml = '<img class="card-image" src="' + card.images[0] + '" alt="' + escapeHtml(card.title) + '">';
    } else {
      imgHtml = '<div class="card-no-image">📄</div>';
    }

    var wordsHtml = '';
    if (card.words && card.words.length > 0) {
      wordsHtml = '<div class="card-words">';
      for (var w = 0; w < card.words.length; w++) {
        var word = card.words[w];
        wordsHtml += '<div class="card-word-item"><span class="cw-en">' + escapeHtml(word.en) + '</span><span class="cw-zh">' + escapeHtml(word.zh) + '</span></div>';
      }
      wordsHtml += '</div>';
    }

    html += '<div class="card-item">' +
      imgHtml +
      '<div class="card-body">' +
        '<div class="card-title">' + escapeHtml(card.title) + '</div>' +
        '<div class="card-meta">' +
          '<span>NO. ' + card.id + '</span>' +
          '<span>' + (card.words ? card.words.length : 0) + ' 个单词</span>' +
        '</div>' +
        wordsHtml +
        '<div class="card-actions">' +
          '<button class="btn btn-outline btn-sm" onclick="openDetail(' + card.id + ')">卡片</button>' +
          '<button class="btn btn-outline btn-sm" onclick="openDetail(' + card.id + ', \'zh\')">中文展示</button>' +
          '<button class="btn btn-outline btn-sm" onclick="openDetail(' + card.id + ', \'en\')">英文展示</button>' +
          '<button class="btn btn-outline btn-sm" onclick="openEditModal(' + card.id + ')">编辑</button>' +
          '<button class="btn btn-danger btn-sm" onclick="deleteCard(' + card.id + ')">删除</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  list.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

function openEditModal(cardId) {
  editingCard = cardId ? cards.find(function (c) { return c.id === cardId; }) : null;
  editingImages = [];

  document.getElementById('editModalTitle').textContent = editingCard ? '✏️ 编辑卡片' : '➕ 新增卡片';
  document.getElementById('editId').value = editingCard ? editingCard.id : '';
  document.getElementById('editCardTitle').value = editingCard ? editingCard.title : '';
  document.getElementById('batchInput').value = '';

  var editor = document.getElementById('wordsEditor');
  editor.innerHTML = '';

  if (editingCard && editingCard.words) {
    for (var i = 0; i < editingCard.words.length; i++) {
      addWordRow(editingCard.words[i]);
    }
  }

  var preview = document.getElementById('imagePreview');
  preview.innerHTML = '';

  if (editingCard && editingCard.images) {
    for (var j = 0; j < editingCard.images.length; j++) {
      addImagePreview(editingCard.images[j], false, null);
    }
  }

  document.getElementById('editImages').value = '';
  showModal('editModal');
}

function batchParseWords() {
  var raw = document.getElementById('batchInput').value.trim();
  if (!raw) {
    showToast('请先在批量输入框中粘贴 JSON 数据');
    return;
  }

  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    showToast('JSON 解析失败: ' + e.message);
    return;
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    showToast('请提供一个非空的 JSON 数组');
    return;
  }

  var editor = document.getElementById('wordsEditor');
  editor.innerHTML = '';

  var count = 0;
  for (var i = 0; i < parsed.length; i++) {
    var item = parsed[i];
    if (item.en || item.zh || item.ph) {
      addWordRow({
        en: (item.en || '').toString(),
        ph: (item.ph || '').toString(),
        zh: (item.zh || '').toString()
      });
      count++;
    }
  }

  showToast('✅ 已解析填充 ' + count + ' 个单词');
}

function addWordRow(word) {
  var editor = document.getElementById('wordsEditor');
  var row = document.createElement('div');
  row.className = 'word-row';
  row.innerHTML =
    '<input type="text" placeholder="英文" value="' + (word ? escapeAttr(word.en) : '') + '">' +
    '<input type="text" placeholder="音标" value="' + (word ? escapeAttr(word.ph) : '') + '">' +
    '<input type="text" placeholder="中文" value="' + (word ? escapeAttr(word.zh) : '') + '">' +
    '<button class="btn-remove-word" onclick="this.parentElement.remove()">✕</button>';
  editor.appendChild(row);
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function handleImageSelect(e) {
  var files = Array.from(e.target.files);
  files.forEach(function (file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      addImagePreview(ev.target.result, true, file);
    };
    reader.readAsDataURL(file);
  });
}

function addImagePreview(src, isNew, file) {
  var preview = document.getElementById('imagePreview');
  var item = document.createElement('div');
  item.className = 'image-preview-item';

  var imgData = isNew
    ? { url: src, isNew: true, file: file }
    : { url: src, isNew: false };
  editingImages.push(imgData);
  var idx = editingImages.length - 1;
  item.setAttribute('data-idx', idx);

  item.innerHTML =
    '<img src="' + src + '" alt="预览">' +
    '<button class="remove-image">✕</button>';

  item.querySelector('.remove-image').onclick = function () {
    var i = parseInt(item.getAttribute('data-idx'));
    editingImages[i] = null;
    item.remove();
  };

  preview.appendChild(item);
}

async function compressImage(dataUrl, maxWidth, quality) {
  maxWidth = maxWidth || 1280;
  quality = quality || 0.8;

  var base64 = dataUrl.split(',')[1];
  var sizeInBytes = (base64.length * 3) / 4;

  if (sizeInBytes < 400 * 1024) {
    return dataUrl;
  }

  return new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      var width = img.width;
      var height = img.height;

      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height);
        width = maxWidth;
      }

      var canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      var q = quality;
      var result = canvas.toDataURL('image/jpeg', q);
      var resultSize = result.split(',')[1].length * 0.75;

      while (resultSize > 500 * 1024 && q > 0.2) {
        q -= 0.1;
        result = canvas.toDataURL('image/jpeg', q);
        resultSize = result.split(',')[1].length * 0.75;
      }

      if (resultSize > 500 * 1024 && width > 800) {
        width = 800;
        height = Math.round((800 / img.width) * img.height);
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        q = 0.6;
        result = canvas.toDataURL('image/jpeg', q);
        resultSize = result.split(',')[1].length * 0.75;
        while (resultSize > 500 * 1024 && q > 0.2) {
          q -= 0.1;
          result = canvas.toDataURL('image/jpeg', q);
          resultSize = result.split(',')[1].length * 0.75;
        }
      }

      resolve(result);
    };
    img.onerror = function () {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

async function saveCard() {
  var idInput = document.getElementById('editId').value;
  var id = idInput ? parseInt(idInput) : (cards.length > 0 ? Math.max.apply(null, cards.map(function (c) { return c.id; })) + 1 : 1);
  var title = document.getElementById('editCardTitle').value.trim();

  if (!title) {
    showToast('请填写标题');
    return;
  }

  var wordRows = document.querySelectorAll('.word-row');
  var words = [];
  for (var i = 0; i < wordRows.length; i++) {
    var inputs = wordRows[i].querySelectorAll('input');
    var en = inputs[0].value.trim();
    var ph = inputs[1].value.trim();
    var zh = inputs[2].value.trim();
    if (en || zh || ph) {
      words.push({ en: en, zh: zh, ph: ph });
    }
  }

  var images = [];
  for (var j = 0; j < editingImages.length; j++) {
    var imgData = editingImages[j];
    if (!imgData) continue;

    if (imgData.isNew) {
      try {
        showToast('正在压缩并上传图片 ' + (images.length + 1) + '...');
        console.log('[上传] 开始处理图片', j, '原始大小:', Math.round(imgData.url.split(',')[1].length * 0.75 / 1024) + 'KB');
        var compressed = await compressImage(imgData.url);
        var base64 = compressed.split(',')[1];
        console.log('[上传] 压缩后大小:', Math.round(base64.length * 0.75 / 1024) + 'KB');
        var ext = (imgData.file && imgData.file.type) ? imgData.file.type.split('/')[1] : 'jpg';
        if (ext === 'jpeg') ext = 'jpg';
        if (!ext) ext = 'jpg';
        var filename = Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.' + ext;
        var filepath = IMAGE_DIR + '/' + filename;
        console.log('[上传] 文件路径:', filepath);
        await client.createFile(filepath, base64, '上传图片: ' + filename, true);
        images.push(client.getRawUrl(filepath));
        console.log('[上传] 成功:', client.getRawUrl(filepath));
      } catch (err) {
        console.error('[上传] 失败:', err);
        showToast('图片上传失败: ' + err.message);
        return;
      }
    } else {
      images.push(imgData.url);
    }
  }

  var card = { id: id, title: title, words: words, images: images };

  if (editingCard) {
    var idx = cards.findIndex(function (c) { return c.id === editingCard.id; });
    cards[idx] = card;
  } else {
    cards.push(card);
  }

  try {
    showToast('正在保存数据...');
    var jsonContent = JSON.stringify(cards, null, 2);
    var existing = await client.getFile(DATA_FILE);
    if (existing) {
      await client.updateFile(DATA_FILE, jsonContent, existing.sha, editingCard ? '更新卡片: ' + title : '新增卡片: ' + title);
    } else {
      await client.createFile(DATA_FILE, jsonContent, editingCard ? '更新卡片: ' + title : '新增卡片: ' + title, false);
    }
    showToast('保存成功');
    closeModal('editModal');
    loadCards();
  } catch (err) {
    showToast('保存失败: ' + err.message);
  }
}

function openDetail(cardId, mode) {
  var m = (mode === 'zh' || mode === 'en') ? mode : 'all';
  window.location.href = 'detail.html?id=' + cardId + '&mode=' + m;
}

async function deleteCard(cardId) {
  if (!confirm('确定删除此卡片？此操作不可撤销。')) return;

  var card = cards.find(function (c) { return c.id === cardId; });
  cards = cards.filter(function (c) { return c.id !== cardId; });

  try {
    showToast('正在删除...');
    var jsonContent = JSON.stringify(cards, null, 2);
    var existing = await client.getFile(DATA_FILE);
    if (existing) {
      await client.updateFile(DATA_FILE, jsonContent, existing.sha, '删除卡片: ' + (card ? card.title : cardId));
    } else {
      await client.createFile(DATA_FILE, jsonContent, '删除卡片: ' + (card ? card.title : cardId), false);
    }
    showToast('删除成功');
    loadCards();
  } catch (err) {
    showToast('删除失败: ' + err.message);
  }
}

function showToast(msg) {
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);
}

init();
