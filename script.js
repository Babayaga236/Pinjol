document.addEventListener("DOMContentLoaded", () => {
    console.log("Script loaded"); // Debug log
    lucide.createIcons();

    // ===== KONFIGURASI =====
    const APP_PIN = "1234";
    let editingIndex = null;
    let db = JSON.parse(localStorage.getItem("resantenir_db") || "[]");
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    console.log("DB loaded:", db); // Debug log

    // ===== LOGIN =====
    if (sessionStorage.getItem("isLoggedIn") === "true") {
        document.getElementById("login-screen").style.display = "none";
    }

    const btnLogin = document.getElementById("btnLogin");
    if (btnLogin) {
        btnLogin.onclick = () => {
            const pin = document.getElementById("pinInput").value;
            if (pin.length < 4) {
                document.getElementById("loginError").innerText = "PIN minimal 4 digit!";
                document.getElementById("loginError").style.display = "block";
                return;
            }
            if (pin === APP_PIN) {
                document.getElementById("loginError").style.display = "none";
                sessionStorage.setItem("isLoggedIn", "true");
                location.reload();
            } else {
                document.getElementById("loginError").innerText = "PIN Salah!";
                document.getElementById("loginError").style.display = "block";
                document.getElementById("pinInput").value = "";
            }
        };

        document.getElementById("pinInput").addEventListener("keypress", (e) => {
            if (e.key === "Enter") btnLogin.click();
        });
    }

    // ===== UTILS =====
    const formatIDR = (v) => {
        return v.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const cleanNum = (v) => parseInt(v.replace(/\./g, "")) || 0;

    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getDateDiff = (date) => {
        const today = new Date();
        const target = new Date(date);
        const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
        return diff;
    };

    // ===== TAB SWITCHING =====
    window.switchTab = (tab) => {
        console.log("Switching to tab:", tab); // Debug log
        document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
        const tabEl = document.getElementById(`tab-${tab}`);
        if (tabEl) {
            tabEl.classList.add("active");
        }
        document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
        if (event && event.target) {
            const navItem = event.target.closest(".nav-item");
            if (navItem) navItem.classList.add("active");
        }

        if (tab === "history") render();
        if (tab === "laporan") updateLaporan();
        if (tab === "dashboard") updateDashboard();
    };

    // ===== FORM HANDLING =====
    const setTodayDate = () => {
        const today = new Date().toISOString().split("T")[0];
        const elem = document.getElementById("tanggal_pinjam");
        if (elem) elem.value = today;
    };

    setTodayDate();

    const jumlahInput = document.getElementById("jumlah");
    if (jumlahInput) {
        jumlahInput.addEventListener("input", (e) => {
            e.target.value = formatIDR(e.target.value);
        });
    }

    // ===== TOMBOL SUBMIT =====
    const btnSubmit = document.getElementById("btnSubmit");
    if (btnSubmit) {
        btnSubmit.onclick = () => {
            console.log("Submit clicked"); // Debug log

            const nama = document.getElementById("nama").value.trim();
            const wa = document.getElementById("wa").value.trim();
            const jumlah = cleanNum(document.getElementById("jumlah").value);
            const tanggal_pinjam = document.getElementById("tanggal_pinjam").value;
            const jatuh_tempo = document.getElementById("jatuh_tempo").value;
            const catatan = document.getElementById("catatan").value.trim();

            console.log("Form values:", {nama, wa, jumlah, tanggal_pinjam, jatuh_tempo, catatan}); // Debug log

            const errors = [];
            if (!nama) errors.push("Nama harus diisi");
            if (!wa || !/^62\d{8,}$/.test(wa.replace(/\D/g, ""))) errors.push("WhatsApp harus valid (62...)");
            if (jumlah <= 0) errors.push("Jumlah harus lebih dari 0");
            if (!tanggal_pinjam) errors.push("Tanggal pinjam harus dipilih");
            if (!jatuh_tempo) errors.push("Jatuh tempo harus dipilih");

            if (errors.length > 0) {
                alert("Kesalahan:\n" + errors.join("\n"));
                return;
            }

            const newData = {
                nama,
                wa,
                jumlah,
                tanggal_pinjam,
                jatuh_tempo,
                catatan,
                status: "belum",
                riwayat_bayar: []
            };

            db.push(newData);
            localStorage.setItem("resantenir_db", JSON.stringify(db));
            console.log("Data saved, DB now:", db); // Debug log
            alert("Pinjaman berhasil dicatat!");
            resetForm();
            switchTab("history");
        };
    }

    const resetForm = () => {
        document.getElementById("nama").value = "";
        document.getElementById("wa").value = "";
        document.getElementById("jumlah").value = "";
        document.getElementById("jatuh_tempo").value = "";
        document.getElementById("catatan").value = "";
        setTodayDate();
    };

    // ===== RENDER TABLE =====
    const render = () => {
        console.log("Rendering table"); // Debug log
        const search = document.getElementById("globalSearch").value.toLowerCase();
        const filter = document.getElementById("filterStatus").value;
        const tbody = document.getElementById("tableBody");
        if (!tbody) return;
        
        tbody.innerHTML = "";

        db.forEach((item, idx) => {
            if (search && !item.nama.toLowerCase().includes(search)) return;
            if (filter && item.status !== filter) return;

            const totalBayar = item.riwayat_bayar.reduce((sum, p) => sum + p.jumlah, 0);
            const sisa = item.jumlah - totalBayar;

            const tr = document.createElement("tr");
            tr.style.cursor = "pointer";
            tr.onclick = () => openModal(idx);
            tr.innerHTML = `
                <td><b>${item.nama}</b></td>
                <td>Rp ${item.jumlah.toLocaleString("id-ID")}</td>
                <td>${formatDate(item.tanggal_pinjam)}</td>
                <td>${formatDate(item.jatuh_tempo)}</td>
                <td><b style="color: #ff3b30;">Rp ${sisa.toLocaleString("id-ID")}</b></td>
                <td><span class="badge ${item.status}">${item.status === "belum" ? "Belum Lunas" : item.status === "sebagian" ? "Bayar Sebagian" : "Sudah Lunas"}</span></td>
                <td>
                    <button onclick="event.stopPropagation(); deleteData(${idx})" style="padding: 6px 12px; border-radius: 6px; border: none; background: #ff3b30; color: white; cursor: pointer; font-size: 12px; font-weight: 600;">Hapus</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        lucide.createIcons();
    };

    // ===== MODAL =====
    let currentModalIndex = null;

    window.openModal = (idx) => {
        console.log("Opening modal for index:", idx); // Debug log
        currentModalIndex = idx;
        const item = db[idx];
        const totalBayar = item.riwayat_bayar.reduce((sum, p) => sum + p.jumlah, 0);
        const sisa = item.jumlah - totalBayar;

        document.getElementById("detail-nama").innerText = item.nama;
        document.getElementById("detail-wa").innerHTML = `<a href="https://wa.me/${item.wa.replace(/^0/, "62")}" target="_blank" style="color: var(--primary); text-decoration: none;">${item.wa}</a>`;
        document.getElementById("detail-jumlah").innerText = `Rp ${item.jumlah.toLocaleString("id-ID")}`;
        document.getElementById("detail-bayar").innerText = `Rp ${totalBayar.toLocaleString("id-ID")}`;
        document.getElementById("detail-sisa").innerText = `Rp ${sisa.toLocaleString("id-ID")}`;
        document.getElementById("detail-status").innerHTML = `<span class="badge ${item.status}">${item.status === "belum" ? "Belum Lunas" : item.status === "sebagian" ? "Bayar Sebagian" : "Sudah Lunas"}</span>`;
        document.getElementById("detail-catatan").innerText = item.catatan || "-";

        // Riwayat pembayaran
        const riwayatDiv = document.getElementById("detail-riwayat");
        riwayatDiv.innerHTML = "";
        if (item.riwayat_bayar.length === 0) {
            riwayatDiv.innerHTML = '<div style="padding: 15px; background: var(--bg); border-radius: 10px; text-align: center; color: var(--subtext);">Belum ada pembayaran</div>';
        } else {
            item.riwayat_bayar.forEach((p, i) => {
                const div = document.createElement("div");
                div.style.cssText = "display: flex; justify-content: space-between; padding: 10px; background: var(--bg); border-radius: 8px; margin-bottom: 8px;";
                div.innerHTML = `
                    <div>
                        <small style="color: var(--subtext);">${formatDate(p.tanggal)}</small><br>
                        <b>Rp ${p.jumlah.toLocaleString("id-ID")}</b>
                    </div>
                    <button onclick="removePayment(${idx}, ${i})" style="padding: 4px 8px; font-size: 11px; border-radius: 4px; border: none; background: #ff3b30; color: white; cursor: pointer;">Hapus</button>
                `;
                riwayatDiv.appendChild(div);
            });
        }

        document.getElementById("modal-tgl-bayar").value = new Date().toISOString().split("T")[0];
        document.getElementById("modal-jumlah-bayar").value = "";

        const modal = document.getElementById("modal-detail");
        if (modal) modal.classList.add("active");
    };

    window.closeModal = () => {
        const modal = document.getElementById("modal-detail");
        if (modal) modal.classList.remove("active");
        currentModalIndex = null;
    };

    window.addPayment = () => {
        if (currentModalIndex === null) return;
        const tgl = document.getElementById("modal-tgl-bayar").value;
        const jumlah = cleanNum(document.getElementById("modal-jumlah-bayar").value);

        if (!tgl || jumlah <= 0) {
            alert("Tanggal dan jumlah harus diisi!");
            return;
        }

        const item = db[currentModalIndex];
        const totalBayar = item.riwayat_bayar.reduce((sum, p) => sum + p.jumlah, 0);
        const sisa = item.jumlah - totalBayar;

        if (jumlah > sisa) {
            alert(`Jumlah melebihi sisa hutang (Rp ${sisa.toLocaleString("id-ID")})`);
            return;
        }

        item.riwayat_bayar.push({ tanggal: tgl, jumlah });

        const newTotal = item.riwayat_bayar.reduce((sum, p) => sum + p.jumlah, 0);
        if (newTotal >= item.jumlah) {
            item.status = "lunas";
        } else {
            item.status = "sebagian";
        }

        localStorage.setItem("resantenir_db", JSON.stringify(db));
        alert("Pembayaran tercatat!");
        openModal(currentModalIndex);
        render();
    };

    window.removePayment = (idx, payIdx) => {
        if (confirm("Hapus pembayaran ini?")) {
            db[idx].riwayat_bayar.splice(payIdx, 1);
            const totalBayar = db[idx].riwayat_bayar.reduce((sum, p) => sum + p.jumlah, 0);
            db[idx].status = totalBayar >= db[idx].jumlah ? "lunas" : totalBayar > 0 ? "sebagian" : "belum";
            localStorage.setItem("resantenir_db", JSON.stringify(db));
            openModal(idx);
            render();
        }
    };

    window.markAsLunas = () => {
        if (currentModalIndex === null) return;
        db[currentModalIndex].status = "lunas";
        localStorage.setItem("resantenir_db", JSON.stringify(db));
        closeModal();
        render();
        alert("Status diubah menjadi Lunas!");
    };

    window.deleteData = (idx) => {
        if (confirm(`Hapus pinjaman "${db[idx].nama}"?`)) {
            db.splice(idx, 1);
            localStorage.setItem("resantenir_db", JSON.stringify(db));
            closeModal();
            render();
            alert("Data dihapus!");
        }
    };

    // ===== DASHBOARD =====
    const updateDashboard = () => {
        let totalPinjam = 0;
        let totalBelumLunas = 0;
        let totalLunas = 0;
        let countPinjam = 0;
        let countBelum = 0;
        let countLunas = 0;
        const topDebtors = [];
        const upcoming = [];

        db.forEach(item => {
            totalPinjam += item.jumlah;
            countPinjam++;

            const totalBayar = item.riwayat_bayar.reduce((sum, p) => sum + p.jumlah, 0);
            const sisa = item.jumlah - totalBayar;

            if (item.status === "lunas") {
                countLunas++;
                totalLunas += item.jumlah;
            } else {
                countBelum++;
                totalBelumLunas += sisa;
                topDebtors.push({ nama: item.nama, wa: item.wa, sisa });
            }

            const diff = getDateDiff(item.jatuh_tempo);
            if (diff >= 0 && diff <= 7) {
                upcoming.push({ nama: item.nama, wa: item.wa, jatuh_tempo: item.jatuh_tempo, diff });
            }
        });

        document.getElementById("statTotalPinjam").innerText = `Rp ${totalPinjam.toLocaleString("id-ID")}`;
        document.getElementById("statCountPinjam").innerText = `${countPinjam} orang`;
        document.getElementById("statBelumLunas").innerText = `Rp ${totalBelumLunas.toLocaleString("id-ID")}`;
        document.getElementById("statCountBelum").innerText = `${countBelum} orang`;
        document.getElementById("statLunas").innerText = `Rp ${totalLunas.toLocaleString("id-ID")}`;
        document.getElementById("statCountLunas").innerText = `${countLunas} orang`;

        const minDiff = Math.min(...upcoming.map(u => u.diff).filter(d => d >= 0));
        document.getElementById("statJatuhTempo").innerText = minDiff === Infinity ? "0" : minDiff;

        // Top debtors
        const topDiv = document.getElementById("topDebtors");
        topDiv.innerHTML = "";
        topDebtors.sort((a, b) => b.sisa - a.sisa).slice(0, 3).forEach((d, i) => {
            const div = document.createElement("div");
            div.className = "top-debtor-item";
            div.innerHTML = `
                <div class="debtor-info">
                    <b>${i + 1}. ${d.nama}</b>
                    <small>${d.wa}</small>
                </div>
                <div class="debtor-amount">Rp ${d.sisa.toLocaleString("id-ID")}</div>
            `;
            topDiv.appendChild(div);
        });

        if (topDebtors.length === 0) {
            topDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--subtext);">Semua pelanggan sudah lunas! 🎉</div>';
        }

        // Upcoming due
        const upDiv = document.getElementById("upcomingDue");
        upDiv.innerHTML = "";
        upcoming.sort((a, b) => a.diff - b.diff).forEach(u => {
            const div = document.createElement("div");
            div.className = "top-debtor-item";
            div.style.borderLeft = "4px solid #ff9f40";
            div.innerHTML = `
                <div class="debtor-info">
                    <b>${u.nama}</b>
                    <small>${formatDate(u.jatuh_tempo)} (${u.diff === 0 ? "Hari ini" : u.diff + " hari lagi"})</small>
                </div>
            `;
            upDiv.appendChild(div);
        });

        if (upcoming.length === 0) {
            upDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--subtext);">Tidak ada pinjaman yang jatuh tempo.</div>';
        }
    };

    // ===== LAPORAN =====
    const updateLaporan = () => {
        let totalPinjam = 0;
        let totalBelumLunas = 0;
        let totalLunas = 0;
        let countHariIni = 0;
        let countSeminggu = 0;
        let countSudahTempo = 0;
        const topDebtors = [];

        db.forEach(item => {
            totalPinjam += item.jumlah;
            const totalBayar = item.riwayat_bayar.reduce((sum, p) => sum + p.jumlah, 0);
            const sisa = item.jumlah - totalBayar;

            if (item.status === "lunas") {
                totalLunas += item.jumlah;
            } else {
                totalBelumLunas += sisa;
                topDebtors.push({ nama: item.nama, sisa });
            }

            const diff = getDateDiff(item.jatuh_tempo);
            if (diff === 0) countHariIni++;
            else if (diff > 0 && diff <= 7) countSeminggu++;
            else if (diff < 0) countSudahTempo++;
        });

        document.getElementById("lap-total").innerText = `Rp ${totalPinjam.toLocaleString("id-ID")}`;
        document.getElementById("lap-belum").innerText = `Rp ${totalBelumLunas.toLocaleString("id-ID")}`;
        document.getElementById("lap-lunas").innerText = `Rp ${totalLunas.toLocaleString("id-ID")}`;
        document.getElementById("lap-hari-ini").innerText = `${countHariIni} pinjaman`;
        document.getElementById("lap-seminggu").innerText = `${countSeminggu} pinjaman`;
        document.getElementById("lap-sudah-tempo").innerText = `${countSudahTempo} pinjaman`;

        const topDiv = document.getElementById("laporan-top-debtors");
        topDiv.innerHTML = "";
        topDebtors.sort((a, b) => b.sisa - a.sisa).slice(0, 5).forEach((d, i) => {
            const div = document.createElement("div");
            div.className = "top-debtor-item";
            div.innerHTML = `
                <div class="debtor-info">
                    <b>${i + 1}. ${d.nama}</b>
                </div>
                <div class="debtor-amount">Rp ${d.sisa.toLocaleString("id-ID")}</div>
            `;
            topDiv.appendChild(div);
        });

        if (topDebtors.length === 0) {
            topDiv.innerHTML = '<div style="padding: 15px; text-align: center; color: var(--subtext);">Tidak ada data.</div>';
        }
    };

    // ===== PDF EXPORT =====
    const btnExportPDF = document.getElementById("btnExportPDF");
    if (btnExportPDF) {
        btnExportPDF.onclick = () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF("l", "mm", "a4");

            doc.setFontSize(16);
            doc.text("LAPORAN PINJAMAN RESANTENIR", 14, 15);
            doc.setFontSize(10);
            doc.text(`Tanggal: ${new Date().toLocaleDateString("id-ID")}`, 14, 22);

            const rows = db.map((item, i) => {
                const totalBayar = item.riwayat_bayar.reduce((sum, p) => sum + p.jumlah, 0);
                const sisa = item.jumlah - totalBayar;
                return [
                    i + 1,
                    item.nama,
                    `Rp ${item.jumlah.toLocaleString("id-ID")}`,
                    `Rp ${totalBayar.toLocaleString("id-ID")}`,
                    `Rp ${sisa.toLocaleString("id-ID")}`,
                    formatDate(item.jatuh_tempo),
                    item.status === "belum" ? "Belum" : item.status === "sebagian" ? "Sebagian" : "Lunas"
                ];
            });

            doc.autoTable({
                head: [["No", "Nama", "Jumlah", "Sudah Bayar", "Sisa", "Jatuh Tempo", "Status"]],
                body: rows,
                startY: 30,
                headStyles: { fillColor: [255, 107, 107] },
                bodyStyles: { fontSize: 9 }
            });

            doc.save(`Laporan_Resantenir_${new Date().toISOString().slice(0, 10)}.pdf`);
        };
    }

    // ===== BACKUP & RESTORE =====
    const btnBackup = document.getElementById("btnBackup");
    if (btnBackup) {
        btnBackup.onclick = () => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: "application/json" }));
            a.download = `Backup_Resantenir_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
        };
    }

    const btnRestore = document.getElementById("btnRestore");
    if (btnRestore) {
        btnRestore.onclick = () => document.getElementById("fileInput").click();
    }

    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
        fileInput.onchange = (e) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (!Array.isArray(imported)) throw new Error("Format invalid");
                    db = imported;
                    localStorage.setItem("resantenir_db", JSON.stringify(db));
                    alert("Data berhasil dimuat!");
                    location.reload();
                } catch (err) {
                    alert("Error: " + err.message);
                }
            };
            reader.readAsText(e.target.files[0]);
        };
    }

    // ===== SEARCH =====
    const globalSearch = document.getElementById("globalSearch");
    if (globalSearch) {
        globalSearch.oninput = () => {
            render();
        };
    }

    const filterStatus = document.getElementById("filterStatus");
    if (filterStatus) {
        filterStatus.onchange = () => {
            render();
        };
    }

    // ===== INIT =====
    console.log("App initialized"); // Debug log
    updateDashboard();
    render();
});