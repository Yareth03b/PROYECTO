using System;
using System.Collections.Generic;
using UnityEngine;

namespace UNAB.Transporte3D
{
    [ExecuteAlways]
    public class UNABHudAndConsoleUI : MonoBehaviour
    {
        private static UNABHudAndConsoleUI _instance;
        public static UNABHudAndConsoleUI Instance
        {
            get
            {
                if (_instance == null) _instance = UnityEngine.Object.FindFirstObjectByType<UNABHudAndConsoleUI>();
                return _instance;
            }
            private set => _instance = value;
        }

        private Texture2D logoTex;

        private bool viewsDropdownOpen = false;
        private int activeModalTab = 0;

        private string cmdInputText = "";
        private string cliInputText = "";
        private string newDnsDomain = "";
        private string newDnsIp = "";
        private string statusFeedback = "";
        private Vector2 termScroll = Vector2.zero;

        private GUIStyle brandTitleStyle;
        private GUIStyle btnLabelStyle;
        private GUIStyle floatingTextStyle;
        private GUIStyle badgeTextStyle;
        private GUIStyle titleWhiteStyle;
        private GUIStyle descMutedStyle;
        private GUIStyle specLabelStyle;
        private GUIStyle specValueStyle;
        private GUIStyle terminalTextStyle;
        private GUIStyle textFieldStyle;
        private bool stylesInitialized = false;

        // Colores del diseno original UNAB (Capsula negra y pildoras blancas/grises)
        private static readonly Color ColBarBg = new Color(0.02f, 0.02f, 0.031f, 0.95f);          // #050508
        private static readonly Color ColBarBorder = new Color(1f, 1f, 1f, 0.14f);
        private static readonly Color ColPillDark = new Color(0.082f, 0.082f, 0.098f, 1f);        // #151519
        private static readonly Color ColPillDarkHover = new Color(0.145f, 0.145f, 0.175f, 1f);   // #25252d
        private static readonly Color ColPillDarkBorder = new Color(1f, 1f, 1f, 0.08f);
        private static readonly Color ColPillWhite = new Color(1f, 1f, 1f, 1f);                   // #ffffff
        private static readonly Color ColTextDark = new Color(0.035f, 0.035f, 0.045f, 1f);        // #09090b
        private static readonly Color ColTextLight = new Color(0.90f, 0.90f, 0.93f, 1f);          // #e4e4e7
        private static readonly Color ColCardBg = new Color(0.024f, 0.024f, 0.035f, 0.96f);       // #060609
        private static readonly Color ColCardBorder = new Color(1f, 1f, 1f, 0.14f);
        private static readonly Color ColTermBg = new Color(0.045f, 0.045f, 0.06f, 1f);

        private void OnEnable()
        {
            _instance = this;
            stylesInitialized = false;
            if (logoTex == null) logoTex = Resources.Load<Texture2D>("logo-unab");
        }

        private void Awake()
        {
            _instance = this;
        }

        private void Start()
        {
            logoTex = Resources.Load<Texture2D>("logo-unab");
        }

        public void OnOpenConsoleForKey(string key)
        {
            activeModalTab = 0;
            statusFeedback = "";
            cmdInputText = "";
            cliInputText = "";
        }

        private void InitStyles()
        {
            if (stylesInitialized) return;
            stylesInitialized = true;

            brandTitleStyle = new GUIStyle
            {
                fontSize = 13,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleLeft,
                normal = { textColor = Color.white }
            };

            btnLabelStyle = new GUIStyle
            {
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = Color.white }
            };

            floatingTextStyle = new GUIStyle
            {
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleLeft,
                normal = { textColor = Color.white }
            };

            badgeTextStyle = new GUIStyle
            {
                fontSize = 10,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleCenter,
                normal = { textColor = ColTextDark }
            };

            titleWhiteStyle = new GUIStyle
            {
                fontSize = 14,
                fontStyle = FontStyle.Bold,
                wordWrap = true,
                alignment = TextAnchor.MiddleLeft,
                normal = { textColor = Color.white }
            };

            descMutedStyle = new GUIStyle
            {
                fontSize = 12,
                wordWrap = true,
                alignment = TextAnchor.UpperLeft,
                normal = { textColor = new Color(0.68f, 0.68f, 0.73f) }
            };

            specLabelStyle = new GUIStyle
            {
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleLeft,
                normal = { textColor = new Color(0.65f, 0.65f, 0.71f) }
            };

            specValueStyle = new GUIStyle
            {
                fontSize = 11,
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleRight,
                normal = { textColor = Color.white }
            };

            terminalTextStyle = new GUIStyle
            {
                fontSize = 12,
                wordWrap = true,
                alignment = TextAnchor.UpperLeft,
                padding = new RectOffset(12, 12, 10, 10),
                normal = { textColor = new Color(0.92f, 0.94f, 0.96f) }
            };

            textFieldStyle = new GUIStyle(GUI.skin.textField)
            {
                fontSize = 12,
                alignment = TextAnchor.MiddleLeft,
                padding = new RectOffset(10, 10, 4, 4),
                normal = { background = null, scaledBackgrounds = null, textColor = Color.white },
                focused = { background = null, scaledBackgrounds = null, textColor = Color.white },
                hover = { background = null, scaledBackgrounds = null, textColor = Color.white }
            };
        }

        // Dibuja un rectangulo redondeado o capsula perfecto por hardware (sin distorsion 9-slice ni bordes negros)
        private void DrawRoundedRect(Rect rect, Color fillColor, Color borderColor, float radius, float borderWidth = 1f)
        {
            float r = Mathf.Min(radius, Mathf.Min(rect.width, rect.height) * 0.5f);
            if (fillColor.a > 0.001f)
            {
                GUI.DrawTexture(rect, Texture2D.whiteTexture, ScaleMode.StretchToFill, true, 0f, fillColor, 0f, r);
            }
            if (borderWidth > 0f && borderColor.a > 0.001f)
            {
                GUI.DrawTexture(rect, Texture2D.whiteTexture, ScaleMode.StretchToFill, true, 0f, borderColor, borderWidth, r);
            }
        }

        private void DrawSolidLine(Rect rect, Color color)
        {
            GUI.DrawTexture(rect, Texture2D.whiteTexture, ScaleMode.StretchToFill, true, 0f, color, 0f, 0f);
        }

        // Dibuja un boton pildora identico al menu web (Blanco cuando esta activo, Gris Carbon cuando esta inactivo)
        private bool DrawPillButton(Rect rect, string text, bool isActive)
        {
            bool hovered = rect.Contains(Event.current.mousePosition);
            float r = rect.height * 0.5f;

            Color fill = isActive ? ColPillWhite : (hovered ? ColPillDarkHover : ColPillDark);
            Color border = isActive ? ColPillWhite : (hovered ? new Color(1f, 1f, 1f, 0.25f) : ColPillDarkBorder);
            Color txtCol = isActive ? ColTextDark : (hovered ? Color.white : ColTextLight);

            DrawRoundedRect(rect, fill, border, r, 1f);

            Color prevCol = btnLabelStyle.normal.textColor;
            btnLabelStyle.normal.textColor = txtCol;
            GUI.Label(rect, text, btnLabelStyle);
            btnLabelStyle.normal.textColor = prevCol;

            return GUI.Button(rect, GUIContent.none, GUIStyle.none);
        }

        private string DrawRoundedTextField(Rect rect, string value, bool editable = true)
        {
            DrawRoundedRect(rect, ColPillDark, new Color(1f, 1f, 1f, editable ? 0.18f : 0.06f), 8f, 1f);
            bool prev = GUI.enabled;
            GUI.enabled = editable;
            string res = GUI.TextField(rect, value ?? "", textFieldStyle);
            GUI.enabled = prev;
            return res;
        }

        private void OnGUI()
        {
            InitStyles();
            var ctrl = UNABSceneController.Instance ?? GetComponent<UNABSceneController>() ?? UnityEngine.Object.FindFirstObjectByType<UNABSceneController>();
            var sim = UNABNetworkSimulator.Instance ?? GetComponent<UNABNetworkSimulator>() ?? UnityEngine.Object.FindFirstObjectByType<UNABNetworkSimulator>();
            if (ctrl == null || sim == null) return;

            // 1. ETIQUETAS FLOTANTES 3D (Con filtro de pared en Modo Caminata y capsulas nitidas)
            if (ctrl.labelsVisible && !ctrl.isConsoleOpen && ctrl.mainCamera != null)
            {
                DrawFloatingLabels(ctrl);
            }

            // Calculo dinamico del ancho requerido por el menu superior para adaptarlo a cualquier ventana de Unity
            string lblExtInt = ctrl.IsPlayerOutsideCampus() ? "Ir al Interior (Transporte)" : "Ir a Fachada UNAB";
            string lblFps = ctrl.isFpsMode
                ? (ctrl.isThirdPerson ? "Caminata: 3ra Persona (V)" : "Caminata: 1ra Persona (V)")
                : "Modo Caminata (WASD)";
            string lblViews = "Vistas Rapidas";
            string lblCeil = $"Techo: {(ctrl.ceilingVisible ? "ON" : "OFF")}";
            string lblPack = $"Flujo de Datos: {(ctrl.packetsEnabled ? "ON" : "OFF")}";
            string lblWall = $"Vista Muros: {(ctrl.wallsLowered ? "Bajos" : "Normal")}";
            string lblTags = $"Etiquetas: {(ctrl.labelsVisible ? "ON" : "OFF")}";

            float wExtInt = btnLabelStyle.CalcSize(new GUIContent(lblExtInt)).x + 22f;
            float wFps = btnLabelStyle.CalcSize(new GUIContent(lblFps)).x + 22f;
            float wViews = btnLabelStyle.CalcSize(new GUIContent(lblViews)).x + 22f;
            float wCeil = btnLabelStyle.CalcSize(new GUIContent(lblCeil)).x + 22f;
            float wPack = btnLabelStyle.CalcSize(new GUIContent(lblPack)).x + 22f;
            float wWall = btnLabelStyle.CalcSize(new GUIContent(lblWall)).x + 22f;
            float wTags = btnLabelStyle.CalcSize(new GUIContent(lblTags)).x + 22f;

            float brandSectionW = 240f;
            float buttonsTotalW = wExtInt + wFps + wViews + wCeil + wPack + wWall + wTags + (6f * 6f) + 16f;
            float minMenuWidth = brandSectionW + buttonsTotalW + 36f;

            Matrix4x4 oldMatrix = GUI.matrix;
            float uiScale = Mathf.Clamp(Screen.width / Mathf.Max(1180f, minMenuWidth), 0.35f, 1.0f);
            float vWidth = Screen.width / uiScale;
            float vHeight = Screen.height / uiScale;
            GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(uiScale, uiScale, 1f));

            // 2. MENU SUPERIOR TIPO CAPSULA NEGRA CON LOGO UNAB Y PILDORAS BLANCAS/GRISES
            float navMargin = 14f;
            Rect navRect = new Rect(navMargin, 10f, vWidth - navMargin * 2f, 48f);
            DrawRoundedRect(navRect, ColBarBg, ColBarBorder, 24f, 1.2f);

            float lx = navRect.x + 14f;
            if (logoTex != null)
            {
                Rect logoBg = new Rect(lx, navRect.y + 8f, 32f, 32f);
                DrawRoundedRect(logoBg, new Color(1f, 1f, 1f, 0.06f), new Color(1f, 1f, 1f, 0.14f), 8f, 1f);
                GUI.DrawTexture(new Rect(lx + 2f, navRect.y + 10f, 28f, 28f), logoTex, ScaleMode.ScaleToFit);
                lx += 40f;
            }
            GUI.Label(new Rect(lx, navRect.y + 8f, 165f, 32f), "AREA DE TRANSPORTE", brandTitleStyle);
            lx += 168f;
            DrawSolidLine(new Rect(lx, navRect.y + 13f, 1f, 22f), new Color(1f, 1f, 1f, 0.16f));

            // Botones alineados a la derecha dentro de la capsula
            float rx = navRect.xMax - 12f;
            float btnY = navRect.y + 8f;
            float btnH = 32f;
            float gap = 6f;

            rx -= wTags;
            if (DrawPillButton(new Rect(rx, btnY, wTags, btnH), lblTags, ctrl.labelsVisible))
                ctrl.ToggleLabels();

            rx -= (gap + wWall);
            if (DrawPillButton(new Rect(rx, btnY, wWall, btnH), lblWall, ctrl.wallsLowered))
                ctrl.ToggleWalls();

            rx -= (gap + wPack);
            if (DrawPillButton(new Rect(rx, btnY, wPack, btnH), lblPack, ctrl.packetsEnabled))
                ctrl.TogglePackets();

            rx -= (gap + wCeil);
            if (DrawPillButton(new Rect(rx, btnY, wCeil, btnH), lblCeil, ctrl.ceilingVisible))
                ctrl.ToggleCeiling();

            rx -= (gap + wViews);
            Rect viewsBtnRect = new Rect(rx, btnY, wViews, btnH);
            if (DrawPillButton(viewsBtnRect, lblViews, viewsDropdownOpen))
                viewsDropdownOpen = !viewsDropdownOpen;

            rx -= (gap + wFps);
            if (DrawPillButton(new Rect(rx, btnY, wFps, btnH), lblFps, ctrl.isFpsMode))
            {
                viewsDropdownOpen = false;
                if (ctrl.isFpsMode) ctrl.ToggleThirdPerson();
                else ctrl.ActivateFpsMode();
            }

            rx -= (gap + wExtInt);
            if (DrawPillButton(new Rect(rx, btnY, wExtInt, btnH), lblExtInt, !ctrl.IsPlayerOutsideCampus()))
            {
                viewsDropdownOpen = false;
                ctrl.ToggleExteriorInteriorWalk();
            }

            // Menu desplegable de Vistas Rapidas
            if (viewsDropdownOpen)
            {
                Rect dropRect = new Rect(viewsBtnRect.x, navRect.yMax + 6f, 258f, 398f);
                DrawRoundedRect(dropRect, ColCardBg, ColCardBorder, 16f, 1.2f);
                GUI.Label(new Rect(dropRect.x + 14f, dropRect.y + 10f, 160f, 20f), "VISTAS DE CÁMARA", specLabelStyle);
                if (DrawPillButton(new Rect(dropRect.xMax - 38f, dropRect.y + 8f, 26f, 22f), "X", false))
                    viewsDropdownOpen = false;

                float by = dropRect.y + 36f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Caminar en Fachada UNAB", ctrl.IsPlayerOutsideCampus()))
                { ctrl.TeleportPlayerTo(new Vector3(36.5f, 0f, 3.5f), -90f, 4f); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Esquina Street View (Luzuriaga)", false))
                { ctrl.SwitchToCameraView("streetview"); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Vista Satélite Google Maps", false))
                { ctrl.SwitchToCameraView("satelite"); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Caminar en Área Transporte", !ctrl.IsPlayerOutsideCampus()))
                { ctrl.TeleportPlayerTo(new Vector3(2.2f, 0f, -0.4f), 0f, 12f); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Vista Panorámica Fachada UNAB", false))
                { ctrl.SwitchToCameraView("fachada"); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Alternar 1ra / 3ra Persona (V)", ctrl.isThirdPerson))
                { ctrl.ToggleThirdPerson(); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Vista Aérea Interior (Sin Techo)", false))
                { ctrl.SwitchToCameraView("iso"); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Cuarto de Servidores (Rack)", false))
                { ctrl.SwitchToCameraView("datacenter"); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Paso de Cableado / Techo", false))
                { ctrl.SwitchToCameraView("cabling"); viewsDropdownOpen = false; }
                by += 35f;
                if (DrawPillButton(new Rect(dropRect.x + 12f, by, 234f, 30f), "Monitores GPS Buses", false))
                { ctrl.SwitchToCameraView("monitoring"); viewsDropdownOpen = false; }
            }

            // 3. MIRA CENTRAL FINA Y PILDORA INFERIOR EN MODO CAMINATA
            if (ctrl.isFpsMode && !ctrl.isConsoleOpen)
            {
                // Punto central circular de 6px (sin cuadrado gigante)
                DrawRoundedRect(new Rect(vWidth * 0.5f - 4f, vHeight * 0.5f - 4f, 8f, 8f), new Color(0f, 0f, 0f, 0.55f), Color.clear, 4f, 0f);
                DrawRoundedRect(new Rect(vWidth * 0.5f - 2.5f, vHeight * 0.5f - 2.5f, 5f, 5f), Color.white, Color.clear, 2.5f, 0f);

                string hint = "WASD: Caminar  |  Ratón: Mirar  |  Tecla V: 1ra/3ra Persona  |  Tecla F: Usar Equipo  |  Tecla E: Cerrar  |  ESC: Vista General";
                float hw = btnLabelStyle.CalcSize(new GUIContent(hint)).x + 32f;
                Rect hintRect = new Rect((vWidth - hw) * 0.5f, vHeight - 42f, hw, 30f);
                DrawRoundedRect(hintRect, ColBarBg, ColBarBorder, 15f, 1f);
                GUI.Label(hintRect, hint, btnLabelStyle);
            }

            // 4. PANEL DE INSPECCION DERECHO
            if (!string.IsNullOrEmpty(ctrl.activeInspectedKey) && !ctrl.isConsoleOpen &&
                sim.EquipmentDB.TryGetValue(ctrl.activeInspectedKey, out var info))
            {
                Rect inspRect = new Rect(vWidth - 354f, 68f, 340f, 360f);
                DrawRoundedRect(inspRect, ColCardBg, ColCardBorder, 18f, 1.2f);

                GUIContent badgeContent = new GUIContent(info.category);
                float bw = badgeTextStyle.CalcSize(badgeContent).x + 20f;
                Rect badgeRect = new Rect(inspRect.x + 16f, inspRect.y + 14f, bw, 22f);
                DrawRoundedRect(badgeRect, Color.white, Color.white, 11f, 0f);
                GUI.Label(badgeRect, badgeContent, badgeTextStyle);

                if (DrawPillButton(new Rect(inspRect.xMax - 62f, inspRect.y + 12f, 46f, 24f), "E  X", false))
                {
                    ctrl.activeInspectedKey = "";
                }

                float cy = inspRect.y + 44f;
                GUI.Label(new Rect(inspRect.x + 16f, cy, 308f, 38f), info.title, titleWhiteStyle);
                cy += 40f;
                GUI.Label(new Rect(inspRect.x + 16f, cy, 308f, 64f), info.description, descMutedStyle);
                cy += 66f;

                DrawSolidLine(new Rect(inspRect.x + 16f, cy, 308f, 1f), new Color(1f, 1f, 1f, 0.12f));
                cy += 10f;

                foreach (var sp in info.specs)
                {
                    GUI.Label(new Rect(inspRect.x + 16f, cy, 130f, 22f), sp.label + ":", specLabelStyle);
                    GUI.Label(new Rect(inspRect.x + 142f, cy, 182f, 22f), sp.value, specValueStyle);
                    cy += 23f;
                }

                if (ctrl.activeInspectedKey != "structured_cabling" &&
                    ctrl.activeInspectedKey != "portico_unab" &&
                    ctrl.activeInspectedKey != "unab_bus_01")
                {
                    string btnLabel = ctrl.activeInspectedKey.StartsWith("pc_")
                        ? "Usar Monitor / Consola PC (Tecla F)"
                        : "Abrir Sistema / Configurar (Tecla F)";
                    if (DrawPillButton(new Rect(inspRect.x + 16f, inspRect.yMax - 44f, 308f, 32f), btnLabel, true))
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

        private void DrawFloatingLabels(UNABSceneController ctrl)
        {
            List<Rect> drawnRects = new List<Rect>();
            Vector3 camPos = ctrl.mainCamera.transform.position;
            bool camOutside = camPos.x > 8.2f || Mathf.Abs(camPos.z) > 6.0f;

            foreach (var lbl in ctrl.floatingLabels)
            {
                bool lblOutside = lbl.worldPosition.x > 8.05f || Mathf.Abs(lbl.worldPosition.z) > 5.8f;

                if (ctrl.isFpsMode)
                {
                    if (camOutside != lblOutside) continue;
                    float dist = Vector3.Distance(camPos, lbl.worldPosition);
                    if (camOutside)
                    {
                        if (dist > 62.0f) continue;
                    }
                    else
                    {
                        if (dist > 8.5f) continue;
                        bool camInOffice = camPos.x > -3.0f;
                        bool camInServer = camPos.x < -3.4f;
                        if (camInOffice && lbl.worldPosition.x < -3.3f) continue;
                        if (camInServer && lbl.worldPosition.x > -3.1f) continue;
                    }
                }
                else
                {
                    // En vista orbital interior (sin techo), ocultar etiquetas lejanas de la avenida para no saturar
                    if (!ctrl.ceilingVisible && lbl.worldPosition.x > 14f) continue;
                }

                Vector3 screenPos = ctrl.mainCamera.WorldToScreenPoint(lbl.worldPosition);
                float maxZ = camOutside ? 155f : 26f;
                if (screenPos.z > 0.4f && screenPos.z < maxZ)
                {
                    GUIContent content = new GUIContent(lbl.text);
                    Vector2 textSize = floatingTextStyle.CalcSize(content);
                    float pw = textSize.x + 28f;
                    float ph = 24f;
                    Rect r = new Rect(screenPos.x - pw * 0.5f, Screen.height - screenPos.y - ph * 0.5f, pw, ph);

                    for (int pass = 0; pass < 3; pass++)
                    {
                        bool overlaps = false;
                        foreach (var prev in drawnRects)
                        {
                            if (r.Overlaps(prev))
                            {
                                r.y = prev.y - r.height - 4f;
                                overlaps = true;
                            }
                        }
                        if (!overlaps) break;
                    }

                    if (r.y > 66f && r.yMax < Screen.height - 50f)
                    {
                        drawnRects.Add(r);
                        DrawRoundedRect(r, ColBarBg, new Color(1f, 1f, 1f, 0.18f), 12f, 1f);
                        DrawRoundedRect(new Rect(r.x + 9f, r.y + 9.5f, 5f, 5f), Color.white, Color.clear, 2.5f, 0f);
                        GUI.Label(new Rect(r.x + 19f, r.y, r.width - 24f, r.height), content, floatingTextStyle);
                    }
                }
            }
        }

        private void DrawInteractiveConsoleModal(UNABSceneController ctrl, UNABNetworkSimulator sim, string key, float vWidth, float vHeight)
        {
            DrawSolidLine(new Rect(0, 0, vWidth, vHeight), new Color(0f, 0f, 0f, 0.68f));

            float mw = Mathf.Min(860f, vWidth - 40f);
            float mh = Mathf.Min(540f, vHeight - 60f);
            Rect mRect = new Rect((vWidth - mw) * 0.5f, (vHeight - mh) * 0.5f, mw, mh);
            DrawRoundedRect(mRect, ColCardBg, ColCardBorder, 20f, 1.2f);

            if (!sim.EquipmentDB.TryGetValue(key, out var info)) return;

            GUIContent bCont = new GUIContent(info.category);
            float bWidth = badgeTextStyle.CalcSize(bCont).x + 20f;
            Rect bRect = new Rect(mRect.x + 20f, mRect.y + 16f, bWidth, 24f);
            DrawRoundedRect(bRect, Color.white, Color.white, 12f, 0f);
            GUI.Label(bRect, bCont, badgeTextStyle);

            GUI.Label(new Rect(bRect.xMax + 12f, mRect.y + 15f, mw - bWidth - 120f, 26f), info.title, titleWhiteStyle);

            if (DrawPillButton(new Rect(mRect.xMax - 70f, mRect.y + 14f, 52f, 28f), "E  X", false))
            {
                ctrl.isConsoleOpen = false;
                if (ctrl.isFpsMode) ctrl.LockMouseCursor();
                return;
            }

            float ty = mRect.y + 52f;
            DrawSolidLine(new Rect(mRect.x + 16f, ty - 4f, mw - 32f, 1f), new Color(1f, 1f, 1f, 0.12f));

            if (key.StartsWith("pc_"))
            {
                string[] tabs = { "Sistema GPS UNAB (Web)", "IP Configuration", "Command Prompt (CMD)" };
                DrawTabButtons(mRect.x + 20f, ty + 4f, tabs);
                Rect bodyRect = new Rect(mRect.x + 20f, ty + 46f, mw - 40f, mh - 110f);

                if (activeModalTab == 0) DrawPcWebBrowserTab(bodyRect, sim, key);
                else if (activeModalTab == 1) DrawPcIpConfigTab(bodyRect, sim, key);
                else DrawPcCmdTab(bodyRect, sim, key);
            }
            else if (key == "rack_main")
            {
                string[] tabs = { "Servidor: Services (DHCP/DNS/HTTP)", "Router: Config & NAT", "Switch: VLANs & Puertos", "CLI (Cisco IOS)" };
                DrawTabButtons(mRect.x + 20f, ty + 4f, tabs);
                Rect bodyRect = new Rect(mRect.x + 20f, ty + 46f, mw - 40f, mh - 110f);

                if (activeModalTab == 0) DrawServerServicesTab(bodyRect, sim);
                else if (activeModalTab == 1) DrawRouterConfigTab(bodyRect, sim);
                else if (activeModalTab == 2) DrawSwitchPortsTab(bodyRect, sim);
                else DrawRouterCliTab(bodyRect, sim);
            }
            else if (key == "printer_net")
            {
                string[] tabs = { "Cola de Impresión & Niveles EcoTank" };
                DrawTabButtons(mRect.x + 20f, ty + 4f, tabs);
                DrawPrinterTab(new Rect(mRect.x + 20f, ty + 46f, mw - 40f, mh - 110f), sim);
            }
            else
            {
                string[] tabs = { "Panel de Control & Telemetría" };
                DrawTabButtons(mRect.x + 20f, ty + 4f, tabs);
                DrawUpsAndCracTab(new Rect(mRect.x + 20f, ty + 46f, mw - 40f, mh - 110f), sim, key);
            }
        }

        private void DrawTabButtons(float startX, float y, string[] labels)
        {
            float x = startX;
            for (int i = 0; i < labels.Length; i++)
            {
                GUIContent c = new GUIContent(labels[i]);
                float w = btnLabelStyle.CalcSize(c).x + 24f;
                if (DrawPillButton(new Rect(x, y, w, 30f), labels[i], activeModalTab == i))
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

            Rect urlBar = new Rect(area.x, area.y, area.width, 30f);
            DrawRoundedRect(urlBar, ColTermBg, new Color(1f, 1f, 1f, 0.1f), 8f, 1f);
            GUI.Label(new Rect(urlBar.x + 12f, urlBar.y, urlBar.width - 24f, urlBar.height),
                $"URL:  https://gps.unab.edu.pe/dashboard  ({sim.serverIp}:443)", specLabelStyle);

            if (!linkUp || !httpOk || !subnetOk)
            {
                string reason = "El servicio HTTP/GPS o PostgreSQL está apagado en el Servidor Central (192.168.20.10).";
                if (!linkUp) reason = $"El puerto {pc.switchPort} del Switch conectado a esta PC está en estado DOWN.";
                else if (!subnetOk) reason = $"La IP actual ({pc.ip}) no pertenece a la subred LAN 192.168.20.0/24.";

                GUI.Label(new Rect(area.x + 12f, area.y + 48f, area.width - 24f, 28f), "No se puede acceder al sitio web (ERR_CONNECTION_REFUSED)", titleWhiteStyle);
                GUI.Label(new Rect(area.x + 12f, area.y + 80f, area.width - 24f, 50f), "Diagnóstico de Red: " + reason, descMutedStyle);
                return;
            }

            Rect mapRect = new Rect(area.x, area.y + 38f, area.width, 160f);
            DrawRoundedRect(mapRect, new Color(0.035f, 0.075f, 0.125f, 1f), new Color(0.22f, 0.74f, 0.97f, 0.25f), 12f, 1f);

            float[] routeYs = { mapRect.y + 36f, mapRect.y + 82f, mapRect.y + 128f };
            string[] routeNames = { "Ruta Norte: Paramonga / Pativilca", "Ruta Sur: Supe / Puerto Supe", "Ruta Centro: Plaza de Armas Barranca" };

            for (int i = 0; i < 3; i++)
            {
                DrawSolidLine(new Rect(mapRect.x + 20f, routeYs[i], mapRect.width - 140f, 3f), new Color(0.22f, 0.74f, 0.97f, 0.55f));
                GUI.Label(new Rect(mapRect.x + 22f, routeYs[i] - 20f, 260f, 18f), routeNames[i], specLabelStyle);
            }

            Rect campusRect = new Rect(mapRect.xMax - 106f, mapRect.y + 16f, 90f, 128f);
            DrawRoundedRect(campusRect, Color.white, Color.white, 12f, 0f);
            GUI.Label(campusRect, "CAMPUS\nUNAB", badgeTextStyle);

            for (int i = 0; i < sim.buses.Count; i++)
            {
                var bus = sim.buses[i];
                float bx = mapRect.x + 26f + bus.progress * (mapRect.width - 190f);
                Rect busPill = new Rect(bx, routeYs[i] - 11f, 66f, 22f);
                DrawPillButton(busPill, bus.id, bus.status == "EN RUTA");
            }

            float ty = mapRect.yMax + 10f;
            GUI.Label(new Rect(area.x, ty, 360f, 24f), "CONTROL DE FLOTA UNAB EN TIEMPO REAL", titleWhiteStyle);
            if (DrawPillButton(new Rect(area.xMax - 265f, ty - 2f, 265f, 28f), $"Imprimir Reporte en Epson ({sim.printerIp})", true))
            {
                if (!sim.IsDeviceLinkUp("printer_net"))
                {
                    statusFeedback = "Error: El puerto Gi0/6 de la impresora en el Switch está apagado.";
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

            ty += 32f;
            foreach (var b in sim.buses)
            {
                GUI.Label(new Rect(area.x, ty, 130f, 24f), $"{b.id} ({b.plate})", titleWhiteStyle);
                GUI.Label(new Rect(area.x + 135f, ty + 3f, 290f, 22f), b.route, descMutedStyle);
                GUI.Label(new Rect(area.x + 425f, ty, 165f, 24f), $"{b.status} ({b.speed} km/h)", specValueStyle);

                string actionTxt = b.status == "EN RUTA" ? "Detener en Paradero" : "Despachar a Ruta";
                if (DrawPillButton(new Rect(area.xMax - 160f, ty - 1f, 160f, 25f), actionTxt, false))
                {
                    if (b.status == "EN RUTA") { b.status = "EN PARADERO"; b.speed = 0; }
                    else { b.status = "EN RUTA"; b.speed = 46; }
                }
                ty += 30f;
            }

            if (!string.IsNullOrEmpty(statusFeedback))
            {
                GUI.Label(new Rect(area.x, area.yMax - 22f, area.width, 20f), statusFeedback, specLabelStyle);
            }
        }

        private void DrawPcIpConfigTab(Rect area, UNABNetworkSimulator sim, string pcKey)
        {
            var pc = sim.pcs[pcKey];
            bool isDhcp = pc.mode == "DHCP";

            GUI.Label(new Rect(area.x, area.y, 380f, 26f), $"Configuración IPv4 - {pc.hostname} ({pc.switchPort})", titleWhiteStyle);

            if (DrawPillButton(new Rect(area.x + 400f, area.y, 110f, 28f), "DHCP", isDhcp))
            {
                sim.RequestDhcpForPc(pcKey, out statusFeedback);
            }
            if (DrawPillButton(new Rect(area.x + 518f, area.y, 110f, 28f), "Static", !isDhcp))
            {
                pc.mode = "Static";
                sim.SyncPcSpecs(pcKey);
                statusFeedback = "Modo IP Estática activado. Puedes editar los campos abajo.";
            }

            float ry = area.y + 44f;
            DrawLabeledField(area.x, ref ry, "IPv4 Address:", ref pc.ip, !isDhcp);
            DrawLabeledField(area.x, ref ry, "Subnet Mask:", ref pc.mask, !isDhcp);
            DrawLabeledField(area.x, ref ry, "Default Gateway:", ref pc.gateway, !isDhcp);
            DrawLabeledField(area.x, ref ry, "DNS Server:", ref pc.dns, !isDhcp);

            if (DrawPillButton(new Rect(area.x, ry + 8f, 220f, 32f), "Guardar Configuración IP", true))
            {
                sim.SyncPcSpecs(pcKey);
                statusFeedback = $"Configuración aplicada: {pc.ip} / {pc.mask}";
            }

            GUI.Label(new Rect(area.x, ry + 50f, area.width, 24f), $"Dirección Física MAC: {pc.mac}   |   {statusFeedback}", descMutedStyle);
        }

        private void DrawLabeledField(float x, ref float y, string label, ref string val, bool editable)
        {
            GUI.Label(new Rect(x, y, 155f, 26f), label, specLabelStyle);
            val = DrawRoundedTextField(new Rect(x + 165f, y, 210f, 26f), val, editable);
            y += 34f;
        }

        private void DrawPcCmdTab(Rect area, UNABNetworkSimulator sim, string pcKey)
        {
            var pc = sim.pcs[pcKey];
            string[] quick = { "ipconfig /all", "ping 192.168.20.10", "ping gps.unab.edu.pe", "ping 192.168.20.1", "ping 192.168.20.200", "arp -a", "cls" };
            float qx = area.x;
            foreach (var q in quick)
            {
                float w = btnLabelStyle.CalcSize(new GUIContent(q)).x + 18f;
                if (DrawPillButton(new Rect(qx, area.y, w, 26f), q, false))
                {
                    sim.ExecutePcCommand(pcKey, q);
                    termScroll.y = 99999f;
                }
                qx += w + 6f;
            }

            Rect outRect = new Rect(area.x, area.y + 34f, area.width, area.height - 76f);
            DrawRoundedRect(outRect, ColTermBg, new Color(1f, 1f, 1f, 0.1f), 10f, 1f);

            float contentH = Mathf.Max(outRect.height - 16f, terminalTextStyle.CalcHeight(new GUIContent(pc.cmdHistory), outRect.width - 36f));
            termScroll = GUI.BeginScrollView(outRect, termScroll, new Rect(0, 0, outRect.width - 28f, contentH));
            GUI.Label(new Rect(6f, 4f, outRect.width - 32f, contentH), pc.cmdHistory, terminalTextStyle);
            GUI.EndScrollView();

            float iy = area.yMax - 32f;
            GUI.Label(new Rect(area.x, iy, 190f, 28f), $"C:\\Users\\{pc.hostname}>", titleWhiteStyle);
            cmdInputText = DrawRoundedTextField(new Rect(area.x + 195f, iy, area.width - 315f, 28f), cmdInputText, true);
            if (DrawPillButton(new Rect(area.xMax - 110f, iy, 110f, 28f), "Ejecutar", true) ||
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
            y += 30f;

            DrawServiceToggle(area.x, y, "HTTP / API GPS (80/443):", ref sim.srvHttpGps);
            DrawServiceToggle(area.x, y + 34f, "Base de Datos PostgreSQL:", ref sim.srvPostgres);
            DrawServiceToggle(area.x, y + 68f, "Servicio DHCP Server:", ref sim.srvDhcp);
            DrawServiceToggle(area.x, y + 102f, "Servicio DNS Server (53):", ref sim.srvDns);

            float ry = y;
            DrawLabeledField(area.x + colW + 20f, ref ry, "Default Gateway:", ref sim.dhcpGateway, true);
            DrawLabeledField(area.x + colW + 20f, ref ry, "DNS Server:", ref sim.dhcpDns, true);
            DrawLabeledField(area.x + colW + 20f, ref ry, "Start IP Pool:", ref sim.dhcpStartIp, true);

            float dy = area.y + 175f;
            GUI.Label(new Rect(area.x, dy, 260f, 26f), "REGISTROS DNS (ZONA UNAB)", titleWhiteStyle);
            if (string.IsNullOrEmpty(newDnsDomain)) newDnsDomain = "intranet.unab.edu.pe";
            if (string.IsNullOrEmpty(newDnsIp)) newDnsIp = "192.168.20.10";
            newDnsDomain = DrawRoundedTextField(new Rect(area.x + 265f, dy, 190f, 26f), newDnsDomain, true);
            newDnsIp = DrawRoundedTextField(new Rect(area.x + 465f, dy, 140f, 26f), newDnsIp, true);
            if (DrawPillButton(new Rect(area.x + 615f, dy, 160f, 26f), "+ Añadir Registro A", true))
            {
                sim.dnsRecords.Add(new DnsRecord { domain = newDnsDomain, type = "A", ip = newDnsIp });
            }

            dy += 34f;
            for (int i = 0; i < sim.dnsRecords.Count; i++)
            {
                var r = sim.dnsRecords[i];
                GUI.Label(new Rect(area.x, dy, 250f, 22f), r.domain, titleWhiteStyle);
                GUI.Label(new Rect(area.x + 260f, dy + 2f, 80f, 22f), r.type, descMutedStyle);
                GUI.Label(new Rect(area.x + 350f, dy, 160f, 22f), r.ip, specValueStyle);
                if (DrawPillButton(new Rect(area.x + 540f, dy, 90f, 22f), "Eliminar", false))
                {
                    sim.dnsRecords.RemoveAt(i);
                    break;
                }
                dy += 26f;
            }
        }

        private void DrawServiceToggle(float x, float y, string label, ref bool state)
        {
            GUI.Label(new Rect(x, y, 200f, 26f), label, specLabelStyle);
            if (DrawPillButton(new Rect(x + 205f, y, 125f, 26f), state ? "ON (Activo)" : "OFF (Inactivo)", state))
            {
                state = !state;
            }
        }

        private void DrawRouterConfigTab(Rect area, UNABNetworkSimulator sim)
        {
            float y = area.y;
            GUI.Label(new Rect(area.x, y, 380f, 26f), $"Router Gateway ({sim.routerHostname})", titleWhiteStyle);
            y += 34f;

            DrawServiceToggle(area.x, y, "GigabitEthernet0/0 (WAN):", ref sim.routerWanUp);
            DrawServiceToggle(area.x + 380f, y, "GigabitEthernet0/1 (LAN):", ref sim.routerLanUp);
            y += 42f;

            DrawLabeledField(area.x, ref y, "IP WAN Fibra UNAB:", ref sim.routerWanIp, true);
            DrawLabeledField(area.x, ref y, "IP Gateway LAN:", ref sim.routerLanIp, true);
            DrawLabeledField(area.x, ref y, "Máscara Subred LAN:", ref sim.routerLanMask, true);

            GUI.Label(new Rect(area.x, y + 10f, area.width, 42f),
                $"Regla NAT Port Forwarding Activa: Tramas 4G GPS Buses (UDP 5055) -> Servidor Interno ({sim.serverIp}:5055)", descMutedStyle);
        }

        private void DrawSwitchPortsTab(Rect area, UNABNetworkSimulator sim)
        {
            float y = area.y;
            GUI.Label(new Rect(area.x, y, area.width, 24f), "Switch Administrable 24 Puertos (192.168.20.2) & Patch Panel Cat6A", titleWhiteStyle);
            y += 32f;

            foreach (var sp in sim.switchPorts)
            {
                GUI.Label(new Rect(area.x, y, 75f, 24f), sp.port, titleWhiteStyle);
                GUI.Label(new Rect(area.x + 80f, y + 3f, 250f, 22f), sp.device, descMutedStyle);
                GUI.Label(new Rect(area.x + 335f, y, 150f, 24f), sp.vlan, specLabelStyle);
                GUI.Label(new Rect(area.x + 490f, y, 130f, 24f), sp.up ? "UP (1000Mbps)" : "DOWN", specValueStyle);

                if (DrawPillButton(new Rect(area.xMax - 150f, y, 150f, 24f), sp.up ? "Apagar Puerto" : "Encender Puerto", sp.up))
                {
                    sp.up = !sp.up;
                }
                y += 31f;
            }
        }

        private void DrawRouterCliTab(Rect area, UNABNetworkSimulator sim)
        {
            string[] quick = { "show ip interface brief", "show vlan brief", "show running-config", "show ip route", "show ip dhcp binding", "clear" };
            float qx = area.x;
            foreach (var q in quick)
            {
                float w = btnLabelStyle.CalcSize(new GUIContent(q)).x + 18f;
                if (DrawPillButton(new Rect(qx, area.y, w, 26f), q, false))
                {
                    sim.ExecuteRouterCli(q);
                    termScroll.y = 99999f;
                }
                qx += w + 6f;
            }

            Rect outRect = new Rect(area.x, area.y + 34f, area.width, area.height - 76f);
            DrawRoundedRect(outRect, ColTermBg, new Color(1f, 1f, 1f, 0.1f), 10f, 1f);

            float contentH = Mathf.Max(outRect.height - 16f, terminalTextStyle.CalcHeight(new GUIContent(sim.routerCliHistory), outRect.width - 36f));
            termScroll = GUI.BeginScrollView(outRect, termScroll, new Rect(0, 0, outRect.width - 28f, contentH));
            GUI.Label(new Rect(6f, 4f, outRect.width - 32f, contentH), sim.routerCliHistory, terminalTextStyle);
            GUI.EndScrollView();

            float iy = area.yMax - 32f;
            GUI.Label(new Rect(area.x, iy, 190f, 28f), $"{sim.routerHostname}#", titleWhiteStyle);
            cliInputText = DrawRoundedTextField(new Rect(area.x + 195f, iy, area.width - 315f, 28f), cliInputText, true);
            if (DrawPillButton(new Rect(area.xMax - 110f, iy, 110f, 28f), "Ejecutar", true))
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
            y += 36f;

            GUI.Label(new Rect(area.x, y, 420f, 24f), "COLA DE IMPRESIÓN EN RED (PUERTO TCP 9100)", specLabelStyle);
            if (DrawPillButton(new Rect(area.xMax - 210f, y - 3f, 210f, 26f), "Imprimir Página de Prueba", true))
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
            y += 32f;

            foreach (var j in sim.printJobs)
            {
                GUI.Label(new Rect(area.x, y, 60f, 22f), "#" + j.id, titleWhiteStyle);
                GUI.Label(new Rect(area.x + 70f, y + 2f, 260f, 22f), j.doc, descMutedStyle);
                GUI.Label(new Rect(area.x + 340f, y, 160f, 22f), j.user, specLabelStyle);
                GUI.Label(new Rect(area.x + 510f, y, 120f, 22f), j.time, specLabelStyle);
                GUI.Label(new Rect(area.xMax - 120f, y, 120f, 22f), j.state, specValueStyle);
                y += 25f;
            }
        }

        private void DrawUpsAndCracTab(Rect area, UNABNetworkSimulator sim, string key)
        {
            float y = area.y;
            if (key == "ups_power")
            {
                GUI.Label(new Rect(area.x, y, area.width, 26f), $"Estado del Sistema UPS 3000VA: {sim.upsMode}", titleWhiteStyle);
                y += 34f;
                GUI.Label(new Rect(area.x, y, 450f, 24f), $"Voltaje Entrada AC: {sim.upsInputV} V   |   Salida Regulada: {sim.upsOutputV} V", descMutedStyle);
                y += 28f;
                GUI.Label(new Rect(area.x, y, 450f, 24f), $"Carga del Rack: {sim.upsLoad}% (918 W)   |   Baterías: {sim.upsBattery}%", descMutedStyle);
                y += 40f;

                string btnTxt = sim.upsInputV > 0 ? "Simular Corte Eléctrico en Campus" : "Restaurar Energía Comercial AC (220V)";
                if (DrawPillButton(new Rect(area.x, y, 310f, 32f), btnTxt, true))
                {
                    if (sim.upsInputV > 0)
                    {
                        sim.upsInputV = 0;
                        sim.upsMode = "Respaldo Batería Online (Inversor 220V Activo)";
                        sim.upsBattery = 95;
                    }
                    else
                    {
                        sim.upsInputV = 220;
                        sim.upsMode = "AC Normal (Doble Conversión)";
                        sim.upsBattery = 100;
                    }
                }
            }
            else
            {
                DrawServiceToggle(area.x, y, "Climatizador EDApower CRAC:", ref sim.cracPower);
                y += 40f;
                GUI.Label(new Rect(area.x, y, 240f, 24f), $"Temperatura Objetivo: {sim.cracTargetTemp:F1} °C", titleWhiteStyle);
                sim.cracTargetTemp = GUI.HorizontalSlider(new Rect(area.x + 250f, y + 6f, 220f, 20f), sim.cracTargetTemp, 16f, 25f);
                y += 34f;
                GUI.Label(new Rect(area.x, y, 450f, 24f), $"Humedad Relativa: {sim.cracHumidity}%   |   Inyección por Piso Falso: Activa", descMutedStyle);
            }
        }
    }
}
