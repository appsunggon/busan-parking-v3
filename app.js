const parkingList = document.querySelector("#parking-list");
const statusMessage = document.querySelector("#status-message");

const searchInput = document.querySelector("#search-input");
const searchButton = document.querySelector("#search-button");
const resetButton = document.querySelector("#reset-button");

const pagination = document.querySelector("#pagination");
const prevButton = document.querySelector("#prev-button");
const nextButton = document.querySelector("#next-button");
const pageInfo = document.querySelector("#page-info");

const realtimePanel =
  document.querySelector("#realtime-panel");

const realtimeName =
  document.querySelector("#realtime-name");

const maximumCount =
  document.querySelector("#maximum-count");

const parkingCount =
  document.querySelector("#parking-count");

const availableCount =
  document.querySelector("#available-count");

const lastUpdateTime =
  document.querySelector("#last-update-time");

const closeRealtimeButton =
  document.querySelector("#close-realtime-button");


// 한 페이지에 요청할 주차장 수
const numOfRows = 10;

// 현재 페이지
let currentPage = 1;

// 전체 페이지 수
let totalPages = 1;

// 검색용 전체 주차장 데이터
let allParkingData = null;

// 전체 데이터 중복 요청 방지
let allParkingLoadingPromise = null;

// 실시간 검색 대기 시간
let searchTimer;


// 검색 문자열 정리
function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, "");
}


// 숫자를 주차면 형식으로 표시
function formatParkingCount(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "-";
  }

  return `${value}면`;
}


// API에서 특정 목록 페이지 가져오기
async function fetchParkingPage(pageNo) {
  const response = await fetch(
    `/api/parking?pageNo=${pageNo}&numOfRows=${numOfRows}`
  );

  if (!response.ok) {
    throw new Error(`HTTP 오류: ${response.status}`);
  }

  const data = await response.json();

  if (data.response.header.resultCode !== "00") {
    throw new Error(data.response.header.resultMsg);
  }

  return data.response.body;
}


// item을 항상 배열로 변환
function getItems(body) {
  let items = body.items?.item || [];

  if (!Array.isArray(items)) {
    items = [items];
  }

  return items;
}


// 실시간 정보창 닫기
function closeRealtimePanel() {
  realtimePanel.hidden = true;
}


// 주차장 목록을 표에 출력
function displayParkingList(items) {
  parkingList.innerHTML = "";

  closeRealtimePanel();

  if (items.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 3;
    cell.className = "empty-message";
    cell.textContent = "검색 결과가 없습니다.";

    row.appendChild(cell);
    parkingList.appendChild(row);

    return;
  }

  items.forEach((parking) => {
    const row = document.createElement("tr");

    const codeCell = document.createElement("td");
    codeCell.textContent = parking.parkgcd;

    const nameCell = document.createElement("td");
    nameCell.textContent = parking.parknm;

    const realtimeCell = document.createElement("td");

    const realtimeButton = document.createElement("button");

    realtimeButton.type = "button";
    realtimeButton.className = "realtime-button";
    realtimeButton.textContent = "조회";

    realtimeButton.addEventListener("click", () => {
      loadRealtimeInformation(
        parking.parkgcd,
        parking.parknm,
        realtimeButton
      );
    });

    realtimeCell.appendChild(realtimeButton);

    row.appendChild(codeCell);
    row.appendChild(nameCell);
    row.appendChild(realtimeCell);

    parkingList.appendChild(row);
  });
}


// 일반 페이지 목록 불러오기
async function loadParkingList(pageNo) {
  statusMessage.textContent =
    "주차장 정보를 불러오는 중입니다.";

  pagination.hidden = false;

  prevButton.disabled = true;
  nextButton.disabled = true;

  try {
    const body = await fetchParkingPage(pageNo);
    const items = getItems(body);

    const totalCount = Number(body.totalCount);

    totalPages = Math.ceil(totalCount / numOfRows);
    currentPage = pageNo;

    displayParkingList(items);

    statusMessage.textContent =
      `전체 ${totalCount}개 중 ${items.length}개를 표시했습니다.`;

    pageInfo.textContent =
      `${currentPage} / ${totalPages}`;

    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
  } catch (error) {
    parkingList.innerHTML = "";

    statusMessage.textContent =
      `주차장 정보를 불러오지 못했습니다: ${error.message}`;

    pageInfo.textContent = "- / -";
  }
}


// 전체 목록을 10개씩 나누어 불러오기
async function loadAllParkingData() {
  if (allParkingData !== null) {
    return allParkingData;
  }

  if (allParkingLoadingPromise !== null) {
    return allParkingLoadingPromise;
  }

  allParkingLoadingPromise = (async () => {
    const firstBody = await fetchParkingPage(1);

    const totalCount = Number(firstBody.totalCount);
    const pageCount = Math.ceil(totalCount / numOfRows);

    let combinedData = getItems(firstBody);

    for (let page = 2; page <= pageCount; page++) {
      statusMessage.textContent =
        `전체 주차장 정보를 불러오는 중입니다. (${page}/${pageCount})`;

      const body = await fetchParkingPage(page);
      const items = getItems(body);

      combinedData = combinedData.concat(items);
    }

    return combinedData;
  })();

  try {
    allParkingData = await allParkingLoadingPromise;

    return allParkingData;
  } finally {
    allParkingLoadingPromise = null;
  }
}


// 앞글자 실시간 검색
async function searchParking() {
  let keyword = normalizeText(searchInput.value);

  if (keyword === "") {
    loadParkingList(1);
    return;
  }

  searchButton.disabled = true;
  resetButton.disabled = true;
  pagination.hidden = true;

  statusMessage.textContent =
    "전체 주차장에서 검색하고 있습니다.";

  try {
    const parkingData = await loadAllParkingData();

    keyword = normalizeText(searchInput.value);

    if (keyword === "") {
      loadParkingList(1);
      return;
    }

    const searchResults = parkingData.filter((parking) => {
      const parkingName = normalizeText(parking.parknm);

      return parkingName.startsWith(keyword);
    });

    displayParkingList(searchResults);

    statusMessage.textContent =
      `검색된 주차장: ${searchResults.length}개`;
  } catch (error) {
    parkingList.innerHTML = "";

    statusMessage.textContent =
      `검색 중 오류가 발생했습니다: ${error.message}`;
  } finally {
    searchButton.disabled = false;
    resetButton.disabled = false;
  }
}


// 실시간 주차정보 불러오기
async function loadRealtimeInformation(
  parkingCode,
  parkingName,
  button
) {
  button.disabled = true;
  button.textContent = "조회 중";

  realtimePanel.hidden = false;

  realtimeName.textContent =
    `${parkingName} 실시간 정보`;

  maximumCount.textContent = "-";
  parkingCount.textContent = "-";
  availableCount.textContent = "-";

  lastUpdateTime.textContent =
    "실시간 주차정보를 불러오는 중입니다.";

  try {
    const response = await fetch(
      `/api/realtime?parkingCode=${encodeURIComponent(parkingCode)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }

    const data = await response.json();

    if (data.response.header.resultCode !== "00") {
      throw new Error(data.response.header.resultMsg);
    }

    let item = data.response.body.items?.item;

    if (Array.isArray(item)) {
      item = item[0];
    }

    if (!item) {
      throw new Error("실시간 정보가 없습니다.");
    }

    realtimeName.textContent =
      `${item.parknm || parkingName} 실시간 정보`;

    maximumCount.textContent =
      formatParkingCount(item.maxcnt);

    parkingCount.textContent =
      formatParkingCount(item.parkingcnt);

    availableCount.textContent =
      formatParkingCount(item.curravacnt);

    lastUpdateTime.textContent =
      `최종 갱신 시각: ${item.lastupdatetime || "-"}`;
  } catch (error) {
    realtimeName.textContent =
      `${parkingName} 실시간 정보`;

    lastUpdateTime.textContent =
      `실시간 정보를 가져오지 못했습니다: ${error.message}`;
  } finally {
    button.disabled = false;
    button.textContent = "조회";
  }
}


// 검색 초기화
function resetSearch() {
  searchInput.value = "";

  loadParkingList(1);
}


// 검색 버튼
searchButton.addEventListener("click", searchParking);


// Enter 키 검색
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    clearTimeout(searchTimer);
    searchParking();
  }
});


// 글자를 입력하면 0.3초 후 자동 검색
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    const keyword = normalizeText(searchInput.value);

    if (keyword === "") {
      loadParkingList(1);
    } else {
      searchParking();
    }
  }, 300);
});


// 전체보기 버튼
resetButton.addEventListener("click", () => {
  clearTimeout(searchTimer);
  resetSearch();
});


// 이전 버튼
prevButton.addEventListener("click", () => {
  if (currentPage > 1) {
    loadParkingList(currentPage - 1);
  }
});


// 다음 버튼
nextButton.addEventListener("click", () => {
  if (currentPage < totalPages) {
    loadParkingList(currentPage + 1);
  }
});


// 실시간 정보 닫기
closeRealtimeButton.addEventListener(
  "click",
  closeRealtimePanel
);


// 처음에는 1페이지 표시
loadParkingList(1);