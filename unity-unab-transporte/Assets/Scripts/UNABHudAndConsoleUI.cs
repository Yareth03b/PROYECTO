using System;
using System.Collections.Generic;
using UnityEngine;

namespace UNAB.Transporte3D
{
    public class UNABHudAndConsoleUI : MonoBehaviour
    {
        public static UNABHudAndConsoleUI Instance { get; private set; }

        private Texture2D logoTex;
        private Texture2D darkBarTex;
        private Texture2D darkBtnTex;
        private Texture2D whiteBtnTex;
        private Texture2D cardBgTex;
        private Texture2D mapBgTex;
        private Texture2D lineTex;

        private bool viewsDropdownOpen = false;
        private int activeModalTab = 0;

        private string cmdInputText = "";
        private string cliInputText = "";
        private string newDnsDomain = "";
        private string newDnsIp = "";
        private string statusFeedback = "";
        private Vector2 termScroll = Vector2.zero;

        private GUIStyle barStyle;
        private GUIStyle brandTitleStyle;
        private GUIStyle pillDarkStyle;
        private GUIStyle pillWhiteStyle;
        private GUIStyle floatingPillStyle;
        private GUIStyle cardStyle;
        private GUIStyle badgeWhiteStyle;
        private GUIStyle titleWhiteStyle;
        private GUIStyle descMutedStyle;
        private GUIStyle specLabelStyle;
        private GUIStyle specValueStyle;
        private GUIStyle terminalBoxStyle;
        private GUIStyle textFieldStyle;
        private bool stylesInitialized = false;

        private void Awake()
        {
            Instance = this;
        }

        private void Start()
        {
            logoTex = Resources.Load<Texture2D>("logo-unab");
            darkBarTex = MakeSmoothCapsuleTex(256, 96, new Color(0.02f, 0.02f, 0.03f, 0.96f), new Color(1f, 1f, 1f, 0.14f), 46f);
            darkBtnTex = MakeSmoothCapsuleTex(256, 80, new Color(0.085f, 0.088f, 0.105f, 1f), new Color(1f, 1f, 1f, 0.07f), 38f);
            whiteBtnTex = MakeSmoothCapsuleTex(256, 80, Color.white, Color.white, 38f);
            cardBgTex = MakeSmoothCapsuleTex(256, 256, new Color(0.024f, 0.024f, 0.035f, 0.97f), new Color(1f, 1f, 1f, 0.15f), 36f);
            mapBgTex = MakeSolidTex(new Color(0.035f, 0.075f, 0.125f, 1f));
            lineTex = MakeSolidTex(new Color(1f, 1f, 1f, 0.15f));
        }

        public void OnOpenConsoleForKey(string key)
        {
            activeModalTab = 0;
            statusFeedback = "";
            cmdInputText = "";
            cliInputText = "";
        }

        private Texture2D MakeSolidTex(Color col)
        {
            var t = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            t.SetPixels(new[] { col, col, col, col });
            t.Apply();
            return t;
        }

        // Genera texturas de alta resolucion con bordes redondeados antialiasing (SDF)
        private Texture2D MakeSmoothCapsuleTex(int w, int h, Color fill, Color border, float radius)
        {
            var tex = new Texture2D(w, h, TextureFormat.RGBA32, false)
            {
                filterMode = FilterMode.Bilinear,
                wrapMode = TextureWrapMode.Clamp
            };

            float halfW = w * 0.5f;
            float halfH = h * 0.5f;
            float r = Mathf.Min(radius, Mathf.Min(halfW, halfH) - 2f);

            Color[] pixels = new Color[w * h];
            for (int y = 0; y < h; y++)
            {
                for (int x = 0; x < w; x++)
                {
                    float px = Mathf.Abs(x + 0.5f - halfW) - (halfW - r - 1.5f);
                    float py = Mathf.Abs(y + 0.5f - halfH) - (halfH - r - 1.5f);
                    float ox = Mathf.Max(px, 0f);
                    float oy = Mathf.Max(py, 0f);
                    float dist = Mathf.Sqrt(ox * ox + oy * oy) + Mathf.Min(Mathf.Max(px, py), 0f) - r;

                    float outerAlpha = Mathf.Clamp01(0.5f - dist);
                    float borderBlend = Mathf.Clamp01(0.5f - (dist + 1.8f));
                    Color c = Color.Lerp(border, fill, borderBlend);
                    c.a *= outerAlpha;
                    pixels[y * w + x] = c;
                }
            }
            tex.SetPixels(pixels);
            tex.Apply();
            return tex;
        }

        private void InitStyles()
        {
            if (stylesInitialized) return;
            stylesInitialized = true;

            barStyle = new GUIStyle(GUI.skin.box)
            {
                normal = { background = darkBarTex },
                border = new RectOffset(48, 48, 44, 44),
                padding = new RectOffset(18, 18, 8, 8)
            };

            brandTitleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 14,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleLeft,
                normal = { textColor = Color.white }
            };

            pillDarkStyle = new GUIStyle(GUI.skin.button)
            {
                normal = { background = darkBtnTex, textColor = new Color(0.88f, 0.88f, 0.91f) },
                hover = { background = whiteBtnTex, textColor = Color.black },
                active = { background = whiteBtnTex, textColor = Color.black },
                border = new RectOffset(40, 40, 36, 36),
                fontSize = 12,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                padding = new RectOffset(14, 14, 6, 6)
            };

            pillWhiteStyle = new GUIStyle(pillDarkStyle)
            {
                normal = { background = whiteBtnTex, textColor = new Color(0.04f, 0.04f, 0.05f) },
                hover = { background = whiteBtnTex, textColor = Color.black }
            };

            floatingPillStyle = new GUIStyle(GUI.skin.box)
            {
                normal = { background = darkBarTex, textColor = Color.white },
                border = new RectOffset(44, 44, 40, 40),
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                padding = new RectOffset(12, 12, 4, 4)
            };

            cardStyle = new GUIStyle(GUI.skin.box)
            {
                normal = { background = cardBgTex },
                border = new RectOffset(40, 40, 40, 40),
                padding = new RectOffset(18, 18, 16, 16)
            };

            badgeWhiteStyle = new GUIStyle(GUI.skin.box)
            {
                normal = { background = whiteBtnTex, textColor = new Color(0.04f, 0.04f, 0.05f) },
                border = new RectOffset(36, 36, 32, 32),
                fontSize = 10,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                padding = new RectOffset(12, 12, 4, 4)
            };

            titleWhiteStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 15,
                fontStyle = FontStyle.Bold,
                wordWrap = true,
                normal = { textColor = Color.white }
            };

            descMutedStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 12,
                wordWrap = true,
                normal = { textColor = new Color(0.68f, 0.68f, 0.73f) }
            };

            specLabelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 12,
                fontStyle = FontStyle.Bold,
                normal = { textColor = new Color(0.65f, 0.65f, 0.7f) }
            };

            specValueStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = 12,
                alignment = TextAnchor.MiddleRight,
                normal = { textColor = Color.white }
            };

            terminalBoxStyle = new GUIStyle(GUI.skin.box)
            {
                normal = { background = darkBtnTex, textColor = new Color(0.92f, 0.92f, 0.95f) },
                border = new RectOffset(36, 36, 32, 32),
                padding = new RectOffset(14, 14, 10, 10),
                fontSize = 12,
                alignment = TextAnchor.UpperLeft,
                wordWrap = true
            };

            textFieldStyle = new GUIStyle(GUI.skin.textField)
            {
                normal = { background = darkBtnTex, textColor = Color.white },
                focused = { background = darkBtnTex, textColor = Color.white },
                border = new RectOffset(32, 32, 28, 28),
                fontSize = 12,
                alignment = TextAnchor.MiddleLeft,
                padding = new RectOffset(12, 12, 5, 5)
            };
        }

        private void OnGUI()
        {
            InitStyles();
            var ctrl = UNABSceneController.Instance;
            var sim = UNABNetworkSimulator.Instance;
            if (ctrl == null || sim == null) return;

            // 1. ETIQUETAS FLOTANTES 3D SIN SUPERPOSICION (En espacio real de pantalla)
            if (ctrl.labelsVisible && !ctrl.isConsoleOpen && ctrl.mainCamera != null)
            {
                List<Rect> drawnRects = new List<Rect>();
                foreach (var lbl in ctrl.floatingLabels)
                {
                    Vector3 screenPos = ctrl.mainCamera.WorldToScreenPoint(lbl.worldPosition);
                    if (screenPos.z > 0.3f && screenPos.z < 26f)
                    {
                        GUIContent content = new GUIContent(lbl.text);
                        Vector2 size = floatingPillStyle.CalcSize(content);
                        Rect r = new Rect(screenPos.x - size.x * 0.5f, Screen.height - screenPos.y - size.y * 0.5f, size.x + 10f, size.y + 4f);

                        // Evitar que se encimen en vista isometrica lejana
                        for (int pass = 0; pass < 3; pass++)
                        {
                            bool overlaps = false;
                            foreach (var prev in drawnRects)
                            {
                                if (r.Overlaps(prev))
                                {
                                    r.y = prev.y - r.height - 3f;
                                    overlaps = true;
                                }
                            }
                            if (!overlaps) break;
                        }

                        if (r.y > 72f && r.yMax < Screen.height - 55f)
                        {
                            drawnRects.Add(r);
                            GUI.Box(r, content, floatingPillStyle);
                        }
                    }
                }
            }

            // Escalado responsivo automatico para que el menu superior NUNCA se monte aunque la ventana Game sea pequena
            Matrix4x4 oldMatrix = GUI.matrix;
            float refWidth = 1260f;
            float uiScale = Mathf.Clamp(Screen.width / refWidth, 0.52f, 1.0f);
            float vWidth = Screen.width / uiScale;
            float vHeight = Screen.height / uiScale;
            GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(uiScale, uiScale, 1f));

            // 2. MENU SUPERIOR TIPO CAPSULA NEGRA CON LOGO UNAB Y PILDORAS BLANCAS/GRISES
            Rect navRect = new Rect(18f, 12f, vWidth - 36f, 54f);
            GUI.Box(navRect, GUIContent.none, barStyle);

            float lx = 34f;
            if (logoTex != null)
            {
                GUI.DrawTexture(new Rect(lx, 21f, 36f, 36f), logoTex, ScaleMode.ScaleToFit);
                lx += 46f;
            }
            GUI.Label(new Rect(lx, 21f, 185f, 36f), "AREA DE TRANSPORTE", brandTitleStyle);
            lx += 190f;
            GUI.DrawTexture(new Rect(lx, 28f, 1f, 22f), lineTex);

            float rx = vWidth - 34f;

            float wLabels = 126f;
            rx -= wLabels;
            if (GUI.Button(new Rect(rx, 21f, wLabels, 36f), $"Etiquetas: {(ctrl.labelsVisible ? "ON" : "OFF")}", ctrl.labelsVisible ? pillWhiteStyle : pillDarkStyle))
                ctrl.ToggleLabels();

            rx -= 8f;
            float wWalls = 158f;
            rx -= wWalls;
            if (GUI.Button(new Rect(rx, 21f, wWalls, 36f), $"Vista Muros: {(ctrl.wallsLowered ? "Bajos" : "Normal")}", ctrl.wallsLowered ? pillWhiteStyle : pillDarkStyle))
                ctrl.ToggleWalls();

            rx -= 8f;
            float wPackets = 154f;
            rx -= wPackets;
            if (GUI.Button(new Rect(rx, 21f, wPackets, 36f), $"Flujo de Datos: {(ctrl.packetsEnabled ? "ON" : "OFF")}", ctrl.packetsEnabled ? pillWhiteStyle : pillDarkStyle))
                ctrl.TogglePackets();

            rx -= 8f;
            float wCeil = 112f;
            rx -= wCeil;
            if (GUI.Button(new Rect(rx, 21f, wCeil, 36f), $"Techo: {(ctrl.ceilingVisible ? "ON" : "OFF")}", ctrl.ceilingVisible ? pillWhiteStyle : pillDarkStyle))
                ctrl.ToggleCeiling();

            rx -= 8f;
            float wViews = 132f;
            rx -= wViews;
            Rect viewsBtnRect = new Rect(rx, 21f, wViews, 36f);
            if (GUI.Button(viewsBtnRect, "Vistas Rapidas", viewsDropdownOpen ? pillWhiteStyle : pillDarkStyle))
                viewsDropdownOpen = !viewsDropdownOpen;

            rx -= 8f;
            float wFps = 180f;
            rx -= wFps;
            if (GUI.Button(new Rect(rx, 21f, wFps, 36f), "Modo Caminata (WASD)", ctrl.isFpsMode ? pillWhiteStyle : pillDarkStyle))
            {
                viewsDropdownOpen = false;
                ctrl.ActivateFpsMode();
            }

            if (viewsDropdownOpen)
            {
                Rect dropRect = new Rect(viewsBtnRect.x, 74f, 252f, 236f);
                GUI.Box(dropRect, GUIContent.none, cardStyle);
                GUI.Label(new Rect(dropRect.x + 16f, dropRect.y + 12f, 170f, 22f), "VISTAS DE CAMARA", specLabelStyle);
                if (GUI.Button(new Rect(dropRect.xMax - 44f, dropRect.y + 10f, 30f, 24f), "X", pillDarkStyle))
                    viewsDropdownOpen = false;

                float by = dropRect.y + 42f;
                if (GUI.Button(new Rect(dropRect.x + 14f, by, 224f, 32f), "Vista General Isometrica", pillDarkStyle))
                    ctrl.SwitchToCameraView("iso");
                by += 36f;
                if (GUI.Button(new Rect(dropRect.x + 14f, by, 224f, 32f), "Cuarto de Servidores (Rack)", pillDarkStyle))
                    ctrl.SwitchToCameraView("datacenter");
                by += 36f;
                if (GUI.Button(new Rect(dropRect.x + 14f, by, 224f, 32f), "Paso de Cableado / Techo", pillDarkStyle))
                    ctrl.SwitchToCameraView("cabling");
                by += 36f;
                if (GUI.Button(new Rect(dropRect.x + 14f, by, 224f, 32f), "Monitores GPS Buses", pillDarkStyle))
                    ctrl.SwitchToCameraView("monitoring");
                by += 36f;
                if (GUI.Button(new Rect(dropRect.x + 14f, by, 224f, 32f), "Abrir / Cerrar Puertas", pillDarkStyle))
                    ctrl.ToggleDoors();
            }

            // 3. MIRA CENTRAL Y PILDORA INFERIOR EN MODO CAMINATA
            if (ctrl.isFpsMode && !ctrl.isConsoleOpen)
            {
                GUI.Box(new Rect(vWidth * 0.5f - 5f, vHeight * 0.5f - 5f, 10f, 10f), GUIContent.none, badgeWhiteStyle);
                string hint = "Haz Click o presiona WASD para caminar y mirar  |  Tecla F usar monitor/rack  |  Tecla E cerrar  |  ESC Vista General";
                Rect hintRect = new Rect(vWidth * 0.5f - 370f, vHeight - 48f, 740f, 34f);
                GUI.Box(hintRect, hint, floatingPillStyle);
            }

            // 4. PANEL DE INSPECCION DERECHO
            if (!string.IsNullOrEmpty(ctrl.activeInspectedKey) && !ctrl.isConsoleOpen &&
                sim.EquipmentDB.TryGetValue(ctrl.activeInspectedKey, out var info))
            {
                Rect inspRect = new Rect(vWidth - 360f, 80f, 342f, 366f);
                GUI.Box(inspRect, GUIContent.none, cardStyle);

                GUIContent badgeContent = new GUIContent(info.category);
                Vector2 bSize = badgeWhiteStyle.CalcSize(badgeContent);
                GUI.Box(new Rect(inspRect.x + 18f, inspRect.y + 16f, bSize.x + 14f, 24f), badgeContent, badgeWhiteStyle);

                if (GUI.Button(new Rect(inspRect.xMax - 64f, inspRect.y + 14f, 48f, 26f), "E X", pillDarkStyle))
                {
                    ctrl.activeInspectedKey = "";
                }

                float cy = inspRect.y + 48f;
                GUI.Label(new Rect(inspRect.x + 18f, cy, 306f, 42f), info.title, titleWhiteStyle);
                cy += 44f;
                GUI.Label(new Rect(inspRect.x + 18f, cy, 306f, 64f), info.description, descMutedStyle);
                cy += 68f;

                GUI.DrawTexture(new Rect(inspRect.x + 18f, cy, 306f, 1f), lineTex);
                cy += 10f;

                foreach (var sp in info.specs)
                {
                    GUI.Label(new Rect(inspRect.x + 18f, cy, 130f, 22f), sp.label + ":", specLabelStyle);
                    GUI.Label(new Rect(inspRect.x + 142f, cy, 182f, 22f), sp.value, specValueStyle);
                    cy += 24f;
                }

                if (ctrl.activeInspectedKey != "structured_cabling")
                {
                    string btnLabel = ctrl.activeInspectedKey.StartsWith("pc_")
                        ? "Usar Monitor / Consola PC (Tecla F)"
                        : "Abrir Sistema / Configurar (Tecla F)";
                    if (GUI.Button(new Rect(inspRect.x + 18f, inspRect.yMax - 48f, 306f, 34f), btnLabel, pillWhiteStyle))
                    {
                        ctrl.OpenDeviceConsole();
                    }
                }
            }

            // 5. MODAL INTERACTIVO ESTILO CISCO PACKET TRACER
            if (ctrl.isConsoleOpen && !string.IsNullOrEmpty(ctrl.activeInspectedKey))
            {
                DrawInteractiveConsoleModal(ctrl, sim, ctrl.activeInspectedKey, vWidth, vHeight);
            }

            GUI.matrix = oldMatrix;
        }

        private void DrawInteractiveConsoleModal(UNABSceneController ctrl, UNABNetworkSimulator sim, string key, float vWidth, float vHeight)
        {
            GUI.DrawTexture(new Rect(0, 0, vWidth, vHeight), MakeSolidTex(new Color(0f, 0f, 0f, 0.65f)));

            float mw = Mathf.Min(860f, vWidth - 40f);
            float mh = Mathf.Min(560f, vHeight - 60f);
            Rect mRect = new Rect((vWidth - mw) * 0.5f, (vHeight - mh) * 0.5f, mw, mh);
            GUI.Box(mRect, GUIContent.none, cardStyle);

            if (!sim.EquipmentDB.TryGetValue(key, out var info)) return;

            GUIContent bCont = new GUIContent(info.category);
            Vector2 bSz = badgeWhiteStyle.CalcSize(bCont);
            GUI.Box(new Rect(mRect.x + 22f, mRect.y + 18f, bSz.x + 14f, 24f), bCont, badgeWhiteStyle);
            GUI.Label(new Rect(mRect.x + 34f + bSz.x, mRect.y + 17f, mw - 180f, 26f), info.title, titleWhiteStyle);

            if (GUI.Button(new Rect(mRect.xMax - 72f, mRect.y + 16f, 52f, 28f), "E X", pillDarkStyle))
            {
                ctrl.isConsoleOpen = false;
                if (ctrl.isFpsMode) ctrl.LockMouseCursor();
                return;
            }

            float ty = mRect.y + 54f;
            GUI.DrawTexture(new Rect(mRect.x + 16f, ty - 4f, mw - 32f, 1f), lineTex);

            if (key.StartsWith("pc_"))
            {
                string[] tabs = { "Sistema GPS UNAB (Web)", "IP Configuration", "Command Prompt (CMD)" };
                DrawTabButtons(mRect.x + 22f, ty + 4f, tabs);
                Rect bodyRect = new Rect(mRect.x + 22f, ty + 48f, mw - 44f, mh - 114f);

                if (activeModalTab == 0) DrawPcWebBrowserTab(bodyRect, sim, key);
                else if (activeModalTab == 1) DrawPcIpConfigTab(bodyRect, sim, key);
                else DrawPcCmdTab(bodyRect, sim, key);
            }
            else if (key == "rack_main")
            {
                string[] tabs = { "Servidor: Services (DHCP/DNS/HTTP)", "Router: Config & NAT", "Switch: VLANs & Puertos", "CLI (Cisco IOS)" };
                DrawTabButtons(mRect.x + 22f, ty + 4f, tabs);
                Rect bodyRect = new Rect(mRect.x + 22f, ty + 48f, mw - 44f, mh - 114f);

                if (activeModalTab == 0) DrawServerServicesTab(bodyRect, sim);
                else if (activeModalTab == 1) DrawRouterConfigTab(bodyRect, sim);
                else if (activeModalTab == 2) DrawSwitchPortsTab(bodyRect, sim);
                else DrawRouterCliTab(bodyRect, sim);
            }
            else if (key == "printer_net")
            {
                string[] tabs = { "Cola de Impresion & Niveles EcoTank" };
                DrawTabButtons(mRect.x + 22f, ty + 4f, tabs);
                DrawPrinterTab(new Rect(mRect.x + 22f, ty + 48f, mw - 44f, mh - 114f), sim);
            }
            else
            {
                string[] tabs = { "Panel de Control & Telemetria" };
                DrawTabButtons(mRect.x + 22f, ty + 4f, tabs);
                DrawUpsAndCracTab(new Rect(mRect.x + 22f, ty + 48f, mw - 44f, mh - 114f), sim, key);
            }
        }

        private void DrawTabButtons(float startX, float y, string[] labels)
        {
            float x = startX;
            for (int i = 0; i < labels.Length; i++)
            {
                GUIContent c = new GUIContent(labels[i]);
                float w = pillDarkStyle.CalcSize(c).x + 22f;
                if (GUI.Button(new Rect(x, y, w, 32f), labels[i], activeModalTab == i ? pillWhiteStyle : pillDarkStyle))
                {
                    activeModalTab = i;
                    statusFeedback = "";
                }
                x += w + 8f;
            }
        }

        private void DrawPcWebBrowserTab(Rect area, UNABNetworkSimulator sim, string pcKey)
        {
            var pc = sim.pcs[pcKey];
            bool linkUp = sim.IsDeviceLinkUp(pcKey);
            bool httpOk = sim.srvHttpGps && sim.srvPostgres && sim.IsServerPortUp();
            bool subnetOk = pc.ip.StartsWith("192.168.20.");

            Rect urlBar = new Rect(area.x, area.y, area.width, 32f);
            GUI.Box(urlBar, $"   URL: http://gps.unab.edu.pe/dashboard ({sim.serverIp}:443)", terminalBoxStyle);

            if (!linkUp || !httpOk || !subnetOk)
            {
                string reason = "El servicio HTTP/GPS o PostgreSQL esta apagado en el Servidor Central (192.168.20.10).";
                if (!linkUp) reason = $"El puerto {pc.switchPort} del Switch conectado a esta PC esta en estado DOWN.";
                else if (!subnetOk) reason = $"La IP actual ({pc.ip}) no pertenece a la subred LAN 192.168.20.0/24.";

                GUI.Label(new Rect(area.x + 12f, area.y + 52f, area.width - 24f, 30f), "No se puede acceder al sitio web (ERR_CONNECTION_REFUSED)", titleWhiteStyle);
                GUI.Label(new Rect(area.x + 12f, area.y + 84f, area.width - 24f, 60f), "Diagnostico de Red: " + reason, descMutedStyle);
                return;
            }

            Rect mapRect = new Rect(area.x, area.y + 40f, area.width, 165f);
            GUI.DrawTexture(mapRect, mapBgTex);

            float[] routeYs = { mapRect.y + 36f, mapRect.y + 84f, mapRect.y + 132f };
            string[] routeNames = { "Ruta Norte: Paramonga / Pativilca", "Ruta Sur: Supe / Puerto Supe", "Ruta Centro: Plaza de Armas Barranca" };

            for (int i = 0; i < 3; i++)
            {
                GUI.DrawTexture(new Rect(mapRect.x + 24f, routeYs[i], mapRect.width - 140f, 4f), MakeSolidTex(new Color(0.22f, 0.74f, 0.97f, 0.6f)));
                GUI.Label(new Rect(mapRect.x + 28f, routeYs[i] - 20f, 260f, 20f), routeNames[i], specLabelStyle);
            }

            Rect campusRect = new Rect(mapRect.xMax - 108f, mapRect.y + 16f, 92f, 132f);
            GUI.Box(campusRect, "CAMPUS\nUNAB", badgeWhiteStyle);

            for (int i = 0; i < sim.buses.Count; i++)
            {
                var bus = sim.buses[i];
                float bx = mapRect.x + 30f + bus.progress * (mapRect.width - 195f);
                Rect busPill = new Rect(bx, routeYs[i] - 11f, 68f, 24f);
                GUI.Box(busPill, bus.id, bus.status == "EN RUTA" ? badgeWhiteStyle : pillDarkStyle);
            }

            float ty = mapRect.yMax + 12f;
            GUI.Label(new Rect(area.x, ty, 360f, 24f), "CONTROL DE FLOTA UNAB EN TIEMPO REAL", titleWhiteStyle);
            if (GUI.Button(new Rect(area.xMax - 275f, ty - 2f, 275f, 28f), $"Imprimir Reporte en Epson ({sim.printerIp})", pillWhiteStyle))
            {
                if (!sim.IsDeviceLinkUp("printer_net"))
                {
                    statusFeedback = "Error: El puerto Gi0/6 de la impresora en el Switch esta apagado.";
                }
                else
                {
                    int nextId = 100 + sim.printJobs.Count + 1;
                    sim.printJobs.Insert(0, new PrintJobEntry
                    {
                        id = nextId,
                        doc = $"Reporte_GPS_{pc.hostname}.pdf",
                        user = pc.hostname,
                        pages = 2,
                        time = DateTime.Now.ToString("HH:mm"),
                        state = "Impreso OK"
                    });
                    statusFeedback = $"Trabajo #{nextId} enviado por red (TCP 9100) a la Impresora Epson ({sim.printerIp}).";
                }
            }

            ty += 34f;
            foreach (var b in sim.buses)
            {
                GUI.Label(new Rect(area.x, ty, 130f, 24f), $"{b.id} ({b.plate})", titleWhiteStyle);
                GUI.Label(new Rect(area.x + 135f, ty, 290f, 24f), b.route, descMutedStyle);
                GUI.Label(new Rect(area.x + 430f, ty, 170f, 24f), $"{b.status} ({b.speed} km/h)", specValueStyle);

                string actionTxt = b.status == "EN RUTA" ? "Detener en Paradero" : "Despachar a Ruta";
                if (GUI.Button(new Rect(area.xMax - 165f, ty - 2f, 165f, 26f), actionTxt, pillDarkStyle))
                {
                    if (b.status == "EN RUTA") { b.status = "EN PARADERO"; b.speed = 0; }
                    else { b.status = "EN RUTA"; b.speed = 46; }
                }
                ty += 32f;
            }

            if (!string.IsNullOrEmpty(statusFeedback))
            {
                GUI.Label(new Rect(area.x, area.yMax - 24f, area.width, 22f), statusFeedback, specLabelStyle);
            }
        }

        private void DrawPcIpConfigTab(Rect area, UNABNetworkSimulator sim, string pcKey)
        {
            var pc = sim.pcs[pcKey];
            bool isDhcp = pc.mode == "DHCP";

            GUI.Label(new Rect(area.x, area.y, 380f, 26f), $"Configuracion IPv4 - {pc.hostname} ({pc.switchPort})", titleWhiteStyle);

            if (GUI.Button(new Rect(area.x + 400f, area.y, 110f, 30f), "DHCP", isDhcp ? pillWhiteStyle : pillDarkStyle))
            {
                sim.RequestDhcpForPc(pcKey, out statusFeedback);
            }
            if (GUI.Button(new Rect(area.x + 520f, area.y, 110f, 30f), "Static", !isDhcp ? pillWhiteStyle : pillDarkStyle))
            {
                pc.mode = "Static";
                sim.SyncPcSpecs(pcKey);
                statusFeedback = "Modo IP Estatica activado. Puedes editar los campos abajo.";
            }

            float ry = area.y + 48f;
            DrawLabeledField(area.x, ref ry, "IPv4 Address:", ref pc.ip, !isDhcp);
            DrawLabeledField(area.x, ref ry, "Subnet Mask:", ref pc.mask, !isDhcp);
            DrawLabeledField(area.x, ref ry, "Default Gateway:", ref pc.gateway, !isDhcp);
            DrawLabeledField(area.x, ref ry, "DNS Server:", ref pc.dns, !isDhcp);

            if (GUI.Button(new Rect(area.x, ry + 10f, 220f, 34f), "Guardar Configuracion IP", pillWhiteStyle))
            {
                sim.SyncPcSpecs(pcKey);
                statusFeedback = $"Configuracion aplicada: {pc.ip} / {pc.mask}";
            }

            GUI.Label(new Rect(area.x, ry + 54f, area.width, 24f), $"Direccion Fisica MAC: {pc.mac}   |   {statusFeedback}", descMutedStyle);
        }

        private void DrawLabeledField(float x, ref float y, string label, ref string val, bool editable)
        {
            GUI.Label(new Rect(x, y, 160f, 28f), label, specLabelStyle);
            GUI.enabled = editable;
            val = GUI.TextField(new Rect(x + 170f, y, 220f, 28f), val, textFieldStyle);
            GUI.enabled = true;
            y += 38f;
        }

        private void DrawPcCmdTab(Rect area, UNABNetworkSimulator sim, string pcKey)
        {
            var pc = sim.pcs[pcKey];
            string[] quick = { "ipconfig /all", "ping 192.168.20.10", "ping gps.unab.edu.pe", "ping 192.168.20.1", "ping 192.168.20.200", "arp -a", "cls" };
            float qx = area.x;
            foreach (var q in quick)
            {
                float w = pillDarkStyle.CalcSize(new GUIContent(q)).x + 16f;
                if (GUI.Button(new Rect(qx, area.y, w, 28f), q, pillDarkStyle))
                {
                    sim.ExecutePcCommand(pcKey, q);
                    termScroll.y = 99999f;
                }
                qx += w + 6f;
            }

            Rect outRect = new Rect(area.x, area.y + 38f, area.width, area.height - 86f);
            GUI.Box(outRect, GUIContent.none, terminalBoxStyle);

            float contentH = Mathf.Max(outRect.height - 16f, terminalBoxStyle.CalcHeight(new GUIContent(pc.cmdHistory), outRect.width - 36f));
            termScroll = GUI.BeginScrollView(outRect, termScroll, new Rect(0, 0, outRect.width - 28f, contentH));
            GUI.Label(new Rect(10f, 8f, outRect.width - 36f, contentH), pc.cmdHistory, terminalBoxStyle);
            GUI.EndScrollView();

            float iy = area.yMax - 38f;
            GUI.Label(new Rect(area.x, iy, 195f, 30f), $"C:\\Users\\{pc.hostname}>", titleWhiteStyle);
            cmdInputText = GUI.TextField(new Rect(area.x + 200f, iy, area.width - 320f, 30f), cmdInputText, textFieldStyle);
            if (GUI.Button(new Rect(area.xMax - 110f, iy, 110f, 30f), "Ejecutar", pillWhiteStyle) ||
                (Event.current.type == EventType.KeyDown && Event.current.keyCode == KeyCode.Return && !string.IsNullOrEmpty(cmdInputText)))
            {
                sim.ExecutePcCommand(pcKey, cmdInputText);
                cmdInputText = "";
                termScroll.y = 99999f;
            }
        }

        private void DrawServerServicesTab(Rect area, UNABNetworkSimulator sim)
        {
            float colW = (area.width - 20f) * 0.5f;
            float y = area.y;

            GUI.Label(new Rect(area.x, y, colW, 24f), $"SERVICIOS DEL SERVIDOR ({sim.serverIp})", titleWhiteStyle);
            GUI.Label(new Rect(area.x + colW + 20f, y, colW, 24f), $"POOL DHCP ({sim.dhcpPoolName})", titleWhiteStyle);
            y += 32f;

            DrawServiceToggle(area.x, y, "HTTP / API GPS (80/443):", ref sim.srvHttpGps);
            DrawServiceToggle(area.x, y + 36f, "Base de Datos PostgreSQL:", ref sim.srvPostgres);
            DrawServiceToggle(area.x, y + 72f, "Servicio DHCP Server:", ref sim.srvDhcp);
            DrawServiceToggle(area.x, y + 108f, "Servicio DNS Server (53):", ref sim.srvDns);

            float ry = y;
            DrawLabeledField(area.x + colW + 20f, ref ry, "Default Gateway:", ref sim.dhcpGateway, true);
            DrawLabeledField(area.x + colW + 20f, ref ry, "DNS Server:", ref sim.dhcpDns, true);
            DrawLabeledField(area.x + colW + 20f, ref ry, "Start IP Pool:", ref sim.dhcpStartIp, true);

            float dy = area.y + 185f;
            GUI.Label(new Rect(area.x, dy, 280f, 26f), "REGISTROS DNS (ZONA UNAB)", titleWhiteStyle);
            newDnsDomain = GUI.TextField(new Rect(area.x + 285f, dy, 190f, 28f), string.IsNullOrEmpty(newDnsDomain) ? "intranet.unab.edu.pe" : newDnsDomain, textFieldStyle);
            newDnsIp = GUI.TextField(new Rect(area.x + 485f, dy, 140f, 28f), string.IsNullOrEmpty(newDnsIp) ? "192.168.20.10" : newDnsIp, textFieldStyle);
            if (GUI.Button(new Rect(area.x + 635f, dy, 160f, 28f), "+ Anadir Registro A", pillWhiteStyle))
            {
                sim.dnsRecords.Add(new DnsRecord { domain = newDnsDomain, type = "A", ip = newDnsIp });
            }

            dy += 36f;
            for (int i = 0; i < sim.dnsRecords.Count; i++)
            {
                var r = sim.dnsRecords[i];
                GUI.Label(new Rect(area.x, dy, 260f, 24f), r.domain, titleWhiteStyle);
                GUI.Label(new Rect(area.x + 270f, dy, 80f, 24f), r.type, descMutedStyle);
                GUI.Label(new Rect(area.x + 360f, dy, 160f, 24f), r.ip, specValueStyle);
                if (GUI.Button(new Rect(area.x + 550f, dy, 95f, 24f), "Eliminar", pillDarkStyle))
                {
                    sim.dnsRecords.RemoveAt(i);
                    break;
                }
                dy += 28f;
            }
        }

        private void DrawServiceToggle(float x, float y, string label, ref bool state)
        {
            GUI.Label(new Rect(x, y, 210f, 28f), label, specLabelStyle);
            if (GUI.Button(new Rect(x + 215f, y, 130f, 28f), state ? "ON (Activo)" : "OFF (Inactivo)", state ? pillWhiteStyle : pillDarkStyle))
            {
                state = !state;
            }
        }

        private void DrawRouterConfigTab(Rect area, UNABNetworkSimulator sim)
        {
            float y = area.y;
            GUI.Label(new Rect(area.x, y, 380f, 26f), $"Router Gateway ({sim.routerHostname})", titleWhiteStyle);
            y += 36f;

            DrawServiceToggle(area.x, y, "GigabitEthernet0/0 (WAN):", ref sim.routerWanUp);
            DrawServiceToggle(area.x + 400f, y, "GigabitEthernet0/1 (LAN):", ref sim.routerLanUp);
            y += 44f;

            DrawLabeledField(area.x, ref y, "IP WAN Fibra UNAB:", ref sim.routerWanIp, true);
            DrawLabeledField(area.x, ref y, "IP Gateway LAN:", ref sim.routerLanIp, true);
            DrawLabeledField(area.x, ref y, "Mascara Subred LAN:", ref sim.routerLanMask, true);

            GUI.Label(new Rect(area.x, y + 12f, area.width, 45f),
                $"Regla NAT Port Forwarding Activa: Tramas 4G GPS Buses (UDP 5055) -> Servidor Interno ({sim.serverIp}:5055)", descMutedStyle);
        }

        private void DrawSwitchPortsTab(Rect area, UNABNetworkSimulator sim)
        {
            float y = area.y;
            GUI.Label(new Rect(area.x, y, area.width, 26f), "Switch Administrable 24 Puertos (192.168.20.2) & Patch Panel Cat6A", titleWhiteStyle);
            y += 36f;

            foreach (var sp in sim.switchPorts)
            {
                GUI.Label(new Rect(area.x, y, 75f, 26f), sp.port, titleWhiteStyle);
                GUI.Label(new Rect(area.x + 80f, y, 250f, 26f), sp.device, descMutedStyle);
                GUI.Label(new Rect(area.x + 335f, y, 150f, 26f), sp.vlan, specLabelStyle);
                GUI.Label(new Rect(area.x + 490f, y, 130f, 26f), sp.up ? "UP (1000Mbps)" : "DOWN", specValueStyle);

                if (GUI.Button(new Rect(area.xMax - 150f, y, 150f, 26f), sp.up ? "Apagar Puerto" : "Encender Puerto", sp.up ? pillWhiteStyle : pillDarkStyle))
                {
                    sp.up = !sp.up;
                }
                y += 34f;
            }
        }

        private void DrawRouterCliTab(Rect area, UNABNetworkSimulator sim)
        {
            string[] quick = { "show ip interface brief", "show vlan brief", "show running-config", "show ip route", "show ip dhcp binding", "clear" };
            float qx = area.x;
            foreach (var q in quick)
            {
                float w = pillDarkStyle.CalcSize(new GUIContent(q)).x + 16f;
                if (GUI.Button(new Rect(qx, area.y, w, 28f), q, pillDarkStyle))
                {
                    sim.ExecuteRouterCli(q);
                    termScroll.y = 99999f;
                }
                qx += w + 6f;
            }

            Rect outRect = new Rect(area.x, area.y + 38f, area.width, area.height - 86f);
            GUI.Box(outRect, GUIContent.none, terminalBoxStyle);

            float contentH = Mathf.Max(outRect.height - 16f, terminalBoxStyle.CalcHeight(new GUIContent(sim.routerCliHistory), outRect.width - 36f));
            termScroll = GUI.BeginScrollView(outRect, termScroll, new Rect(0, 0, outRect.width - 28f, contentH));
            GUI.Label(new Rect(10f, 8f, outRect.width - 36f, contentH), sim.routerCliHistory, terminalBoxStyle);
            GUI.EndScrollView();

            float iy = area.yMax - 38f;
            GUI.Label(new Rect(area.x, iy, 195f, 30f), $"{sim.routerHostname}#", titleWhiteStyle);
            cliInputText = GUI.TextField(new Rect(area.x + 200f, iy, area.width - 320f, 30f), cliInputText, textFieldStyle);
            if (GUI.Button(new Rect(area.xMax - 110f, iy, 110f, 30f), "Ejecutar", pillWhiteStyle))
            {
                sim.ExecuteRouterCli(cliInputText);
                cliInputText = "";
                termScroll.y = 99999f;
            }
        }

        private void DrawPrinterTab(Rect area, UNABNetworkSimulator sim)
        {
            float y = area.y;
            DrawLabeledField(area.x, ref y, "IPv4 Impresora Epson:", ref sim.printerIp, true);
            GUI.Label(new Rect(area.x, y, area.width, 24f),
                $"Niveles de Tinta EcoTank:  Negro {sim.inkBk}%  |  Cian {sim.inkC}%  |  Magenta {sim.inkM}%  |  Amarillo {sim.inkY}%", titleWhiteStyle);
            y += 38f;

            GUI.Label(new Rect(area.x, y, 420f, 24f), "COLA DE IMPRESION EN RED (PUERTO TCP 9100)", specLabelStyle);
            if (GUI.Button(new Rect(area.xMax - 210f, y - 4f, 210f, 28f), "Imprimir Pagina de Prueba", pillWhiteStyle))
            {
                sim.printJobs.Insert(0, new PrintJobEntry
                {
                    id = 100 + sim.printJobs.Count + 1,
                    doc = "Test_Red_Epson_EcoTank.pdf",
                    user = "Consola Local",
                    pages = 1,
                    time = DateTime.Now.ToString("HH:mm"),
                    state = "Impreso OK"
                });
            }
            y += 34f;

            foreach (var j in sim.printJobs)
            {
                GUI.Label(new Rect(area.x, y, 60f, 22f), "#" + j.id, titleWhiteStyle);
                GUI.Label(new Rect(area.x + 70f, y, 260f, 22f), j.doc, descMutedStyle);
                GUI.Label(new Rect(area.x + 340f, y, 160f, 22f), j.user, specLabelStyle);
                GUI.Label(new Rect(area.x + 510f, y, 120f, 22f), j.time, specLabelStyle);
                GUI.Label(new Rect(area.xMax - 120f, y, 120f, 22f), j.state, specValueStyle);
                y += 26f;
            }
        }

        private void DrawUpsAndCracTab(Rect area, UNABNetworkSimulator sim, string key)
        {
            float y = area.y;
            if (key == "ups_power")
            {
                GUI.Label(new Rect(area.x, y, area.width, 26f), $"Estado del Sistema UPS 3000VA: {sim.upsMode}", titleWhiteStyle);
                y += 36f;
                GUI.Label(new Rect(area.x, y, 400f, 24f), $"Voltaje Entrada AC: {sim.upsInputV} V   |   Salida Regulada: {sim.upsOutputV} V", descMutedStyle);
                y += 30f;
                GUI.Label(new Rect(area.x, y, 400f, 24f), $"Carga del Rack: {sim.upsLoad}% (918 W)   |   Baterias: {sim.upsBattery}%", descMutedStyle);
                y += 42f;

                string btnTxt = sim.upsInputV > 0 ? "Simular Corte Electrico en Campus" : "Restaurar Energia Comercial AC (220V)";
                if (GUI.Button(new Rect(area.x, y, 310f, 34f), btnTxt, pillWhiteStyle))
                {
                    if (sim.upsInputV > 0)
                    {
                        sim.upsInputV = 0;
                        sim.upsMode = "Respaldo Bateria Online (Inversor 220V Activo)";
                        sim.upsBattery = 95;
                    }
                    else
                    {
                        sim.upsInputV = 220;
                        sim.upsMode = "AC Normal (Doble Conversion)";
                        sim.upsBattery = 100;
                    }
                }
            }
            else
            {
                DrawServiceToggle(area.x, y, "Climatizador EDApower CRAC:", ref sim.cracPower);
                y += 42f;
                GUI.Label(new Rect(area.x, y, 240f, 24f), $"Temperatura Objetivo: {sim.cracTargetTemp:F1} C", titleWhiteStyle);
                sim.cracTargetTemp = GUI.HorizontalSlider(new Rect(area.x + 250f, y + 6f, 220f, 20f), sim.cracTargetTemp, 16f, 25f);
                y += 36f;
                GUI.Label(new Rect(area.x, y, 420f, 24f), $"Humedad Relativa: {sim.cracHumidity}%   |   Inyeccion por Piso Falso: Activa", descMutedStyle);
            }
        }
    }
}
