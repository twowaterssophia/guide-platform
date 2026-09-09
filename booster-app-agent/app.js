const stage = document.querySelector('.app-stage');
const designSize = { width: 1600, height: 900 };
const guideSettingsPage = document.querySelector('#guide-settings-page');
const openTaskDownloadHomeButton = document.querySelector('#open-task-download-home');
const closeGuideSettingsButton = document.querySelector('#close-guide-settings');
const mapUploadPage = document.querySelector('#map-upload-page');
const openMapUploadButton = document.querySelector('#open-map-upload');
const closeMapUploadButton = document.querySelector('#close-map-upload');
const taskDownloadPage = document.querySelector('#task-download-page');
const openTaskDownloadButton = document.querySelector('#open-task-download');
const closeTaskDownloadButton = document.querySelector('#close-task-download');
const mapResourceList = document.querySelector('#map-resource-list');
const mapResourceEmpty = document.querySelector('#map-resource-empty');
const taskResourceList = document.querySelector('#task-resource-list');
const taskCloudEmpty = document.querySelector('#task-cloud-empty');
const taskNetworkEmpty = document.querySelector('#task-network-empty');
const taskDownloadToast = document.querySelector('#task-download-toast');
const taskDeleteConfirm = document.querySelector('#task-delete-confirm');
const taskDeleteConfirmMessage = document.querySelector('#task-delete-confirm-message');
const taskDeleteCancelButton = document.querySelector('#task-delete-cancel');
const taskDeleteConfirmButton = document.querySelector('#task-delete-confirm-button');
const guideTaskActions = document.querySelector('#guide-task-actions');
const pauseGuideTaskButton = document.querySelector('#pause-guide-task');
const nextGuideTaskButton = document.querySelector('#next-guide-task');
const stopGuideTaskButton = document.querySelector('#stop-guide-task');
const guideTasks = [];
let activeGuideTask = null;
let isGuideTaskPaused = false;
let taskDownloadToastTimer = null;
let pendingTaskDeleteRow = null;
let taskDownloadReturnPage = null;

function closeGuideSubPage(page) {
  setPageVisibility(page, false);
  setPageVisibility(guideSettingsPage, true);
}

const mapResourceTemplates = new Map(
  [...mapResourceList.querySelectorAll('.resource-row')].map((row) => [row.dataset.mapName, row.cloneNode(true)]),
);

function fitStageToViewport() {
  const scale = Math.min(
    window.innerWidth / designSize.width,
    window.innerHeight / designSize.height,
  );

  stage.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', fitStageToViewport);
fitStageToViewport();

function setPageVisibility(page, isVisible) {
  page.hidden = !isVisible;
  page.setAttribute('aria-hidden', String(!isVisible));
}

function updateMapEmptyState() {
  const hasMaps = mapResourceList.querySelectorAll('.resource-row').length > 0;
  mapResourceList.hidden = !hasMaps;
  mapResourceEmpty.hidden = hasMaps;
}

function setTaskDownloadToast(message, tone = 'default') {
  window.clearTimeout(taskDownloadToastTimer);
  taskDownloadToast.textContent = message;
  taskDownloadToast.dataset.tone = tone;
  taskDownloadToast.hidden = false;
  taskDownloadToastTimer = window.setTimeout(() => {
    taskDownloadToast.hidden = true;
  }, 2200);
}

function updateTaskDownloadNetworkState() {
  const isOffline = taskDownloadPage.dataset.networkState === 'offline' || navigator.onLine === false;
  const hasCloudTasks = taskDownloadPage.dataset.cloudState !== 'empty' && taskResourceList.querySelectorAll('.task-resource-row').length > 0;
  taskResourceList.hidden = isOffline || !hasCloudTasks;
  taskCloudEmpty.hidden = isOffline || hasCloudTasks;
  taskNetworkEmpty.hidden = !isOffline;
}

function getTaskSyncState(taskRow) {
  return taskRow.dataset.localVersion ? 'added' : 'new';
}

function renderTaskDownloadState(taskRow) {
  const downloadButton = taskRow.querySelector('.task-download-button');
  const moreButton = taskRow.querySelector('.task-more-button');
  const actionsMenu = taskRow.querySelector('.task-actions-menu');
  const syncState = getTaskSyncState(taskRow);
  const isAdded = syncState === 'added';

  downloadButton.disabled = isAdded;
  downloadButton.classList.toggle('resource-button-complete', isAdded);
  downloadButton.textContent = isAdded ? '已添加' : '添加';
  downloadButton.dataset.downloadLabel = isAdded ? '' : downloadButton.textContent;
  moreButton.hidden = !isAdded;
  if (!isAdded) {
    actionsMenu.hidden = true;
    moreButton.setAttribute('aria-expanded', 'false');
  }
}

function refreshTaskDownloadStates() {
  taskResourceList.querySelectorAll('.task-resource-row').forEach(renderTaskDownloadState);
}

function createGuideTaskAction(taskName) {
  const button = document.createElement('button');
  const icon = document.createElement('span');
  const label = document.createElement('span');
  const displayName = taskName;

  button.className = 'agent-action agent-action-task';
  button.type = 'button';
  button.setAttribute('aria-label', `导览任务：${displayName}`);
  icon.className = 'agent-action-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 5.5h7l5 5v8H6v-13Z" />
      <path d="M13 5.5v5h5M9 13h6M9 16h4" />
    </svg>
  `;
  label.textContent = displayName;

  button.append(icon, label);
  button.addEventListener('click', (event) => {
    event.preventDefault();
    activeGuideTask = taskName;
    isGuideTaskPaused = false;
    renderGuideTaskActions();
  });
  return button;
}

function renderGuideTaskActions() {
  const isExecuting = Boolean(activeGuideTask);
  guideTaskActions.replaceChildren(...(isExecuting ? [] : guideTasks.map((task) => createGuideTaskAction(task.name))));
  pauseGuideTaskButton.hidden = !isExecuting;
  nextGuideTaskButton.hidden = !isExecuting;
  stopGuideTaskButton.hidden = !isExecuting;
  openTaskDownloadHomeButton.hidden = isExecuting;

  if (isExecuting) {
    const pauseLabel = isGuideTaskPaused ? '继续' : '暂停';
    pauseGuideTaskButton.setAttribute('aria-label', pauseLabel);
    pauseGuideTaskButton.querySelector('span:last-child').textContent = pauseLabel;
    pauseGuideTaskButton.querySelector('.agent-action-icon').innerHTML = isGuideTaskPaused
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m8 5 10 7-10 7V5Z" /></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14M16 5v14" /></svg>';
  }
}

function addGuideTask(taskName) {
  if (guideTasks.some((task) => task.name === taskName)) return;
  guideTasks.unshift({ name: taskName });
  renderGuideTaskActions();
}

function hydrateGuideTasksFromLocalRows() {
  taskResourceList.querySelectorAll('.task-resource-row[data-local-version]').forEach((row) => {
    if (!guideTasks.some((task) => task.name === row.dataset.taskName)) {
      guideTasks.push({ name: row.dataset.taskName });
    }
  });
}

function closeTaskActionMenus(exceptMenu = null) {
  taskResourceList.querySelectorAll('.task-actions-menu').forEach((menu) => {
    if (menu === exceptMenu) return;
    menu.hidden = true;
    menu.closest('.task-resource-row')?.querySelector('.task-more-button')?.setAttribute('aria-expanded', 'false');
  });
}

function openTaskDeleteConfirm(taskRow) {
  pendingTaskDeleteRow = taskRow;
  taskDeleteConfirmMessage.textContent = `确定删除“${taskRow.dataset.taskName}”吗？如果没有其他导览任务使用该地图，地图资源也会一并删除。`;
  taskDeleteConfirm.hidden = false;
  taskDeleteConfirm.setAttribute('aria-hidden', 'false');
}

function closeTaskDeleteConfirm() {
  pendingTaskDeleteRow = null;
  taskDeleteConfirm.hidden = true;
  taskDeleteConfirm.setAttribute('aria-hidden', 'true');
}

function removeMapIfUnused(mapName) {
  if (!mapName) return false;

  const hasOtherLocalTask = [...taskResourceList.querySelectorAll('.task-resource-row')]
    .some((row) => row.dataset.localVersion && row.dataset.mapName === mapName && row !== pendingTaskDeleteRow);
  if (hasOtherLocalTask) return false;

  const localMapRow = [...mapResourceList.querySelectorAll('.resource-row')]
    .find((row) => row.dataset.mapName === mapName);
  if (!localMapRow) return false;

  localMapRow.remove();
  updateMapEmptyState();
  return true;
}

function ensureLocalMapResource(mapName) {
  if (!mapName || [...mapResourceList.querySelectorAll('.resource-row')].some((row) => row.dataset.mapName === mapName)) return;
  const template = mapResourceTemplates.get(mapName);
  if (!template) return;

  const mapRow = template.cloneNode(true);
  const uploadButton = mapRow.querySelector('.resource-button');
  uploadButton.disabled = false;
  uploadButton.textContent = '上传';
  uploadButton.classList.remove('resource-button-complete');
  mapResourceList.append(mapRow);
  bindMapUploadButton(mapRow);
  updateMapEmptyState();
}

function bindTaskActionMenu(taskRow) {
  const moreButton = taskRow.querySelector('.task-more-button');
  const actionsMenu = taskRow.querySelector('.task-actions-menu');
  const deleteButton = taskRow.querySelector('.task-delete-button');

  moreButton.addEventListener('click', (event) => {
    event.stopPropagation();
    const shouldOpen = actionsMenu.hidden;
    closeTaskActionMenus(actionsMenu);
    actionsMenu.hidden = !shouldOpen;
    moreButton.setAttribute('aria-expanded', String(shouldOpen));
  });

  deleteButton.addEventListener('click', (event) => {
    event.stopPropagation();
    closeTaskActionMenus();
    openTaskDeleteConfirm(taskRow);
  });
}

function openTaskDownload(returnPage = null) {
  taskDownloadReturnPage = returnPage;
  closeTaskDownloadButton.setAttribute('aria-label', returnPage ? '返回导览设置' : '返回首页');
  updateTaskDownloadNetworkState();
  refreshTaskDownloadStates();
  setPageVisibility(guideSettingsPage, false);
  setPageVisibility(taskDownloadPage, true);
}

openTaskDownloadHomeButton.addEventListener('click', () => {
  openTaskDownload();
});

closeGuideSettingsButton.addEventListener('click', () => {
  setPageVisibility(guideSettingsPage, false);
});

openMapUploadButton.addEventListener('click', () => {
  setPageVisibility(guideSettingsPage, false);
  setPageVisibility(mapUploadPage, true);
});

closeMapUploadButton.addEventListener('click', () => {
  closeGuideSubPage(mapUploadPage);
});

openTaskDownloadButton.addEventListener('click', () => {
  openTaskDownload(guideSettingsPage);
});

closeTaskDownloadButton.addEventListener('click', () => {
  setPageVisibility(taskDownloadPage, false);
  if (taskDownloadReturnPage) setPageVisibility(taskDownloadReturnPage, true);
  taskDownloadReturnPage = null;
});

pauseGuideTaskButton.addEventListener('click', () => {
  if (!activeGuideTask) return;
  isGuideTaskPaused = !isGuideTaskPaused;
  renderGuideTaskActions();
});

nextGuideTaskButton.addEventListener('click', () => {
  if (!activeGuideTask) return;
  setTaskDownloadToast('已进入下个环节');
});

stopGuideTaskButton.addEventListener('click', () => {
  activeGuideTask = null;
  isGuideTaskPaused = false;
  renderGuideTaskActions();
});

updateMapEmptyState();
updateTaskDownloadNetworkState();
refreshTaskDownloadStates();
hydrateGuideTasksFromLocalRows();
renderGuideTaskActions();

window.addEventListener('online', updateTaskDownloadNetworkState);
window.addEventListener('offline', updateTaskDownloadNetworkState);

function bindMapUploadButton(row) {
  const uploadButton = row.querySelector('.resource-button');

  uploadButton.addEventListener('click', () => {
    if (uploadButton.disabled) return;

    uploadButton.disabled = true;
    uploadButton.textContent = '上传中';

    window.setTimeout(() => {
      const cloudExists = row.dataset.cloudExists === 'true';
      uploadButton.textContent = cloudExists ? '云端已存在' : '已上传';
      uploadButton.classList.add('resource-button-complete');
    }, 900);
  });
}

document.querySelectorAll('#map-resource-list .resource-row').forEach(bindMapUploadButton);
document.querySelectorAll('.task-resource-row').forEach(bindTaskActionMenu);

document.addEventListener('click', (event) => {
  if (!event.target.closest('.task-resource-actions')) closeTaskActionMenus();
});

taskDeleteCancelButton.addEventListener('click', closeTaskDeleteConfirm);
taskDeleteConfirm.addEventListener('click', (event) => {
  if (event.target === taskDeleteConfirm) closeTaskDeleteConfirm();
});
taskDeleteConfirmButton.addEventListener('click', () => {
  const taskRow = pendingTaskDeleteRow;
  if (!taskRow) return;

  const taskName = taskRow.dataset.taskName;
  const mapName = taskRow.dataset.mapName;
  const wasMapRemoved = removeMapIfUnused(mapName);
  taskRow.dataset.localVersion = '';
  taskRow.dataset.mapDownloaded = wasMapRemoved ? 'false' : 'true';
  renderTaskDownloadState(taskRow);

  const guideTaskIndex = guideTasks.findIndex((task) => task.name === taskName);
  if (guideTaskIndex >= 0) guideTasks.splice(guideTaskIndex, 1);
  if (activeGuideTask === taskName) {
    activeGuideTask = null;
    isGuideTaskPaused = false;
  }
  renderGuideTaskActions();
  closeTaskDeleteConfirm();
  setTaskDownloadToast('导览任务已删除', 'success');
});

document.querySelectorAll('.task-download-button:not(:disabled)').forEach((button) => {
  button.addEventListener('click', () => {
    if (button.disabled) return;

    const taskRow = button.closest('.resource-row');
    const actionLabel = button.dataset.downloadLabel || '添加';
    const needsMapDownload = taskRow.dataset.mapDownloaded !== 'true';
    button.disabled = true;
    button.textContent = '添加中';
    setTaskDownloadToast('导览任务添加中');

    const finishTaskDownload = () => {
      const downloadResult = taskRow.dataset.downloadResult;
      if (navigator.onLine === false || downloadResult === 'failure') {
        button.disabled = false;
        button.textContent = actionLabel;
        setTaskDownloadToast('添加失败，请重试', 'error');
        return;
      }

      if (downloadResult === 'exists') {
        taskRow.dataset.localVersion = taskRow.dataset.cloudVersion;
        renderTaskDownloadState(taskRow);
        setTaskDownloadToast('该任务已存在于机器人，请勿重复添加', 'warning');
        addGuideTask(taskRow.dataset.taskName);
        return;
      }

      taskRow.dataset.localVersion = taskRow.dataset.cloudVersion;
      renderTaskDownloadState(taskRow);
      setTaskDownloadToast('添加成功', 'success');

      addGuideTask(taskRow.dataset.taskName);
    };

      if (needsMapDownload) {
      window.setTimeout(() => {
        taskRow.dataset.mapDownloaded = 'true';
        ensureLocalMapResource(taskRow.dataset.mapName);
        finishTaskDownload();
      }, 1350);
    } else {
      window.setTimeout(finishTaskDownload, 900);
    }
  });
});

document.querySelectorAll('.agent-action:not(#open-task-download-home), .mode-button, .agent-switcher').forEach((button) => {
  button.addEventListener('click', (event) => event.preventDefault());
});
