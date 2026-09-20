const parkingList = document.querySelector("#parking-list");
const statusMessage = document.querySelector("#status-message");

// 주차장 목록 불러오기
async function loadParkingList() {
  statusMessage.textContent = "주차장 정보를 불러오는 중입니다.";

  try {
    const response = await fetch(
      "/api/parking?pageNo=1&numOfRows=10"
    );

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }

    const data = await response.json();

    // 공공데이터 API 처리 결과 확인
    if (data.response.header.resultCode !== "00") {
      throw new Error(data.response.header.resultMsg);
    }

    const body = data.response.body;
    let items = body.items?.item || [];

    // 데이터가 1개일 때도 배열로 처리
    if (!Array.isArray(items)) {
      items = [items];
    }

    // 기존 목록 지우기
    parkingList.innerHTML = "";

    // 주차장 목록을 표에 추가
    items.forEach((parking) => {
      const row = document.createElement("tr");

      const codeCell = document.createElement("td");
      codeCell.textContent = parking.parkgcd;

      const nameCell = document.createElement("td");
      nameCell.textContent = parking.parknm;

      row.appendChild(codeCell);
      row.appendChild(nameCell);

      parkingList.appendChild(row);
    });

    statusMessage.textContent =
      `전체 ${body.totalCount}개 중 ${items.length}개를 표시했습니다.`;
  } catch (error) {
    statusMessage.textContent =
      `주차장 정보를 불러오지 못했습니다: ${error.message}`;
  }
}

// 웹페이지가 열리면 실행
loadParkingList();