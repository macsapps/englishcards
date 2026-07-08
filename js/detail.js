var DATA_FILE = 'data/words.json';

var detailCurrentCard = null;
var detailMode = 'all';
var detailReading = false;

function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseRepoUrl(url) {
  url = url.trim().replace(/\.git$/, '');
  var match = url.match(/gitee\.com\/([^\/]+)\/([^\/\?#]+)/i);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

function getParam(name) {
  var match = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return match ? decodeURIComponent(match[1]) : null;
}

async function init() {
  var id = parseInt(getParam('id'));
  var mode = getParam('mode');
  detailMode = (mode === 'zh' || mode === 'en') ? mode : 'all';
  var autoPlay = getParam('autoplay') === '1';
  var cardTitle = getParam('title') || '';

  if (autoPlay && cardTitle) {
    var titleEl = document.getElementById('detailKicker');
    if (titleEl) titleEl.textContent = decodeURIComponent(cardTitle);
  }

  var parsed = parseRepoUrl(GITEE_REPO_URL);
  if (!parsed) {
    showToast('仓库地址格式无法解析，请检查 js/gitee.js 中的 GITEE_REPO_URL');
    return;
  }

  var client = new GiteeClient(GITEE_TOKEN, parsed.owner, parsed.repo, 'master');

  var ok = await loadDetail(client, id);
  if (autoPlay && ok) {
    // 等待页面渲染并确保语音引擎就绪后，触发与手动点击相同的朗读方案
    await wait(600);
    await voice.ensureReady();
    var folderEl = document.getElementById('detailFolder');
    if (folderEl && typeof folderEl.onclick === 'function') {
      folderEl.onclick();

    }
  }
}

async function loadDetail(client, id) {
  try {
    var file = await client.getFile(DATA_FILE);
    var cards = [];
    if (file) {
      var parsed = JSON.parse(file.content);
      cards = Array.isArray(parsed) ? parsed : [parsed];
    }

    var card = cards.find(function (c) { return c.id === id; });
    if (!card) {
      showToast('未找到该卡片，请返回重试');
      return false;
    }

    renderDetail(card);
    return true;
  } catch (err) {
    console.error('[详情] 加载失败:', err);
    showToast('加载失败: ' + err.message);
    return false;
  }
}

function renderDetail(card) {
  detailCurrentCard = card;

  var bgEl = document.getElementById('cardBg');
  if (card.images && card.images.length > 0) {
    bgEl.style.backgroundImage = 'url("' + card.images[0] + '")';
  } else {
    // bgEl.style.backgroundImage = 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)';
  }

  var parts = (card.title || '').split('|');
  var kickerText = (parts[0] || '').trim();
  var titlePart = parts.length > 1 ? parts[1] : (parts[0] || '');
  var infos = titlePart.split('的');
  var nameText = infos[0] || titlePart;
  var infoText = infos.length > 1 ? '的 ' + infos.slice(1).join('的') : '';

  document.getElementById('detailKicker').textContent = kickerText || '速记.单词卡';
  document.getElementById('detailName').textContent = nameText;
  document.getElementById('detailInfo').textContent = infoText;
  document.getElementById('detailGroupInfo').textContent = (card.words ? card.words.length : 0) + ' 个单词';

  renderWords(card);

  var folderEl = document.getElementById('detailFolder');
  var imagesEl = document.getElementById('detailFolderImages');
  imagesEl.innerHTML = '';

  if (card.images && card.images.length > 0) {
    folderEl.classList.remove('no-images');
    var maxImages = Math.min(card.images.length, 3);
    for (var img = 0; img < maxImages; img++) {
      var imgEl = document.createElement('img');
      imgEl.src = card.images[img];
      imgEl.alt = '图片' + (img + 1);
      imagesEl.appendChild(imgEl);
    }
  } else {
    folderEl.classList.add('no-images');
  }

  var containerEl = document.getElementById('detailContainer');
  containerEl.classList.remove('over_content');

  folderEl.classList.remove('reading');

  folderEl.onclick = function () {
    startReading(folderEl, containerEl);
  };
}

// 统一的朗读方案：autoplay 与手动点击 folder 共用
async function startReading(folderEl, containerEl) {
  if (detailReading || !detailCurrentCard) return;
  detailReading = true;
  // folderEl.classList.add('reading');
  voice.cancel();
  try {
    await detailReadAll(detailCurrentCard.words);
  } finally {
    detailReading = false;
    if (folderEl) folderEl.classList.remove('reading');
    if (containerEl) containerEl.classList.add('over_content');
  }
}

function renderWords(card) {
  var container = document.getElementById('detailCards');
  container.innerHTML = '';
  container.classList.remove('mode-zh', 'mode-en');
  if (detailMode === 'zh') container.classList.add('mode-zh');
  else if (detailMode === 'en') container.classList.add('mode-en');

  if (card.words && card.words.length > 0) {
    card.words.forEach(function (word, index) {
      var cardEl = document.createElement('div');
      cardEl.className = 'card';
      cardEl.dataset.index = index;
      var enHtml, phHtml, cnHtml;
      if (detailMode === 'zh') {
        enHtml = '<p class="word_en word_blank word_blank1"></p>';
        phHtml = '<p class="word_ph word_blank"></p>';
        cnHtml = '<p class="word_cn">' + escapeHtml(word.zh) + '</p>';
      } else if (detailMode === 'en') {
        enHtml = '<p class="word_en">' + escapeHtml(word.en) + '</p>';
        phHtml = '<p class="word_space"></p>';
        cnHtml = '<p class="word_cn word_blank"></p>';
      } else {
        enHtml = '<p class="word_en">' + escapeHtml(word.en) + '</p>';
        phHtml = '<p class="word_ph">' + escapeHtml(word.ph) + '</p>';
        cnHtml = '<p class="word_cn">' + escapeHtml(word.zh) + '</p>';
      }
      cardEl.innerHTML =
        '<span class="card_number">' + pad2(index + 1) + '</span>' +
        '<div class="word-content">' +
        enHtml +
        phHtml +
        cnHtml +
        '</div>';
      container.appendChild(cardEl);
    });
  }
}

function detailHighlightCard(index) {
  var actives = document.querySelectorAll('#detailCards .card.active');
  for (var i = 0; i < actives.length; i++) {
    actives[i].classList.remove('active');
  }
  if (index === null || index === undefined) return;
  var el = document.querySelector('#detailCards .card[data-index="' + index + '"]');
  if (el) el.classList.add('active');
}

function wait(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function detailReadAll(words) {
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    detailHighlightCard(i);
    await voice.speak('en', word.en, 1, 3);
    await wait(500);
    await voice.speak('en', word.en, 0.8, 2);
    await wait(500);
  }
  detailHighlightCard(null);
}

function showToast(msg) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);
}

init();

