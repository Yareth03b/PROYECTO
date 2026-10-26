using System;
using System.Collections.Generic;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace UNAB.Transporte3D
{
    [Serializable]
    public class DoorHingeRef
    {
        public Transform pivot;
        public float closedAngleY;
        public float openAngleY;
    }

    [Serializable]
    public class DataPacketRoute
    {
        public Transform packetMesh;
        public Vector3[] waypoints;
        public float progress;
        public float speed;
    }

    [Serializable]
    public class FloatingLabelRef
    {
        public string text;
        public Vector3 worldPosition;
    }

    public class UNABSceneController : MonoBehaviour
    {
        public static UNABSceneController Instance { get; private set; }

        [Header("Scene References")]
        public Camera mainCamera;
        public GameObject ceilingGroup;
        public List<Transform> wallGroups = new List<Transform>();
        public List<DoorHingeRef> doorHinges = new List<DoorHingeRef>();
        public List<DataPacketRoute> packetRoutes = new List<DataPacketRoute>();
        public List<FloatingLabelRef> floatingLabels = new List<FloatingLabelRef>();

        [Header("Interactive State")]
        public bool isFpsMode = true;
        public bool ceilingVisible = true;
        public bool packetsEnabled = true;
        public bool wallsLowered = false;
        public bool labelsVisible = true;
        public bool doorsOpen = true;
        public bool isConsoleOpen = false;

        public string activeInspectedKey = "";
        public string hoveredKey = "";

        // FPS Camera state
        private float yaw = -90f;
        private float pitch = 0f;
        private float targetYaw = -90f;
        private float targetPitch = 0f;
        private Vector3 fpsVelocity = Vector3.zero;

        // Orbit Camera state
        private Vector3 orbitTarget = new Vector3(0f, 0.8f, 0f);
        private float orbitDistance = 23f;
        private float orbitYaw = 0f;
        private float orbitPitch = 45f;

        // Smooth camera transition
        private bool transitioning = false;
        private Vector3 transStartPos;
        private Vector3 transEndPos;
        private Vector3 transStartLook;
        private Vector3 transEndLook;
        private float transAlpha = 0f;

        private void Awake()
        {
            Instance = this;
            if (mainCamera == null) mainCamera = Camera.main;
        }

        private void Start()
        {
            ActivateFpsMode();
        }

        public void ActivateFpsMode()
        {
            isConsoleOpen = false;
            transitioning = false;
            isFpsMode = true;
            SetCeilingState(true);

            if (mainCamera != null)
            {
                mainCamera.transform.position = new Vector3(2.2f, 1.7f, -0.4f);
            }
            yaw = -90f;
            pitch = 0f;
            targetYaw = yaw;
            targetPitch = pitch;

            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        public void SwitchToCameraView(string viewName)
        {
            isFpsMode = false;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
            SetCeilingState(false);

            Vector3 endPos = new Vector3(0f, 17f, -16f);
            Vector3 endLook = new Vector3(0f, 0.8f, 0f);

            if (viewName == "datacenter")
            {
                endPos = new Vector3(-3.6f, 2.3f, -2.2f);
                endLook = new Vector3(-6.75f, 1.35f, -0.45f);
            }
            else if (viewName == "cabling")
            {
                endPos = new Vector3(-0.5f, 8.2f, -6.0f);
                endLook = new Vector3(-3.0f, 2.5f, 0.0f);
            }
            else if (viewName == "monitoring")
            {
                endPos = new Vector3(2.8f, 3.8f, -0.8f);
                endLook = new Vector3(2.8f, 1.3f, 4.0f);
            }

            transStartPos = mainCamera.transform.position;
            transEndPos = endPos;
            transStartLook = orbitTarget;
            transEndLook = endLook;
            orbitTarget = endLook;

            Vector3 offset = endPos - endLook;
            orbitDistance = offset.magnitude;
            orbitPitch = Mathf.Asin(Mathf.Clamp(offset.normalized.y, -0.98f, 0.98f)) * Mathf.Rad2Deg;
            orbitYaw = Mathf.Atan2(offset.x, offset.z) * Mathf.Rad2Deg;

            transAlpha = 0f;
            transitioning = true;
        }

        public void SetCeilingState(bool visible)
        {
            ceilingVisible = visible;
            if (ceilingGroup != null) ceilingGroup.SetActive(ceilingVisible);
        }

        public void ToggleCeiling() => SetCeilingState(!ceilingVisible);

        public void TogglePackets()
        {
            packetsEnabled = !packetsEnabled;
            foreach (var r in packetRoutes)
            {
                if (r.packetMesh != null) r.packetMesh.gameObject.SetActive(packetsEnabled);
            }
        }

        public void ToggleWalls()
        {
            wallsLowered = !wallsLowered;
            float sy = wallsLowered ? 0.14f : 1.0f;
            foreach (var w in wallGroups)
            {
                if (w != null) w.localScale = new Vector3(1f, sy, 1f);
            }
        }

        public void ToggleLabels() => labelsVisible = !labelsVisible;

        public void ToggleDoors() => doorsOpen = !doorsOpen;

        private void Update()
        {
            float dt = Mathf.Min(Time.deltaTime, 0.1f);

            HandleKeyboardShortcuts();
            UpdateAnimations(dt);

            if (isConsoleOpen) return;

            if (transitioning)
            {
                transAlpha += dt * 2.2f;
                float t = Mathf.Clamp01(transAlpha);
                float smooth = t * t * (3f - 2f * t);
                mainCamera.transform.position = Vector3.Lerp(transStartPos, transEndPos, smooth);
                Vector3 look = Vector3.Lerp(transStartLook, transEndLook, smooth);
                mainCamera.transform.LookAt(look);
                if (t >= 1f) transitioning = false;
                return;
            }

            if (isFpsMode)
            {
                UpdateFpsMovement(dt);
            }
            else
            {
                UpdateOrbitMovement();
            }

            UpdateRaycastInteraction();
        }

        private void HandleKeyboardShortcuts()
        {
            if (WasKeyPressedThisFrame(KeyCode.E))
            {
                if (isConsoleOpen)
                {
                    isConsoleOpen = false;
                }
                else
                {
                    activeInspectedKey = "";
                }
            }

            if (WasKeyPressedThisFrame(KeyCode.Escape))
            {
                if (isConsoleOpen)
                {
                    isConsoleOpen = false;
                }
                else if (isFpsMode)
                {
                    SwitchToCameraView("iso");
                }
            }

            if (isConsoleOpen) return;

            if (WasKeyPressedThisFrame(KeyCode.F))
            {
                string keyToOpen = !string.IsNullOrEmpty(hoveredKey) ? hoveredKey : activeInspectedKey;
                if (!string.IsNullOrEmpty(keyToOpen) && keyToOpen != "structured_cabling")
                {
                    activeInspectedKey = keyToOpen;
                    OpenDeviceConsole();
                }
            }

            if (WasKeyPressedThisFrame(KeyCode.T)) ToggleCeiling();
            if (WasKeyPressedThisFrame(KeyCode.C)) TogglePackets();
            if (WasKeyPressedThisFrame(KeyCode.M)) ToggleWalls();
            if (WasKeyPressedThisFrame(KeyCode.L)) ToggleLabels();
        }

        public void OpenDeviceConsole()
        {
            if (string.IsNullOrEmpty(activeInspectedKey) || activeInspectedKey == "structured_cabling") return;
            isConsoleOpen = true;
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
            if (UNABHudAndConsoleUI.Instance != null)
            {
                UNABHudAndConsoleUI.Instance.OnOpenConsoleForKey(activeInspectedKey);
            }
        }

        private void UpdateFpsMovement(float dt)
        {
            if (Cursor.lockState == CursorLockMode.Locked)
            {
                Vector2 mouseDelta = GetMouseDelta();
                float dx = Mathf.Clamp(mouseDelta.x, -45f, 45f);
                float dy = Mathf.Clamp(mouseDelta.y, -45f, 45f);
                targetYaw += dx * 0.14f;
                targetPitch = Mathf.Clamp(targetPitch - dy * 0.14f, -78f, 78f);
            }

            float smoothLook = Mathf.Min(1f, dt * 18f);
            yaw = Mathf.Lerp(yaw, targetYaw, smoothLook);
            pitch = Mathf.Lerp(pitch, targetPitch, smoothLook);
            mainCamera.transform.rotation = Quaternion.Euler(pitch, yaw, 0f);

            float moveZ = (IsKeyPressed(KeyCode.W) || IsKeyPressed(KeyCode.UpArrow) ? 1f : 0f)
                        - (IsKeyPressed(KeyCode.S) || IsKeyPressed(KeyCode.DownArrow) ? 1f : 0f);
            float moveX = (IsKeyPressed(KeyCode.D) || IsKeyPressed(KeyCode.RightArrow) ? 1f : 0f)
                        - (IsKeyPressed(KeyCode.A) || IsKeyPressed(KeyCode.LeftArrow) ? 1f : 0f);
            float moveY = (IsKeyPressed(KeyCode.Space) ? 1f : 0f)
                        - (IsKeyPressed(KeyCode.LeftShift) || IsKeyPressed(KeyCode.RightShift) ? 1f : 0f);

            Vector3 fwd = Quaternion.Euler(0f, yaw, 0f) * Vector3.forward;
            Vector3 right = Quaternion.Euler(0f, yaw, 0f) * Vector3.right;

            Vector3 targetVel = Vector3.zero;
            if (Mathf.Abs(moveZ) > 0.01f || Mathf.Abs(moveX) > 0.01f)
            {
                targetVel = (fwd * moveZ + right * moveX).normalized * 5.5f;
            }
            targetVel.y = moveY * 3.8f;

            fpsVelocity = Vector3.Lerp(fpsVelocity, targetVel, Mathf.Min(1f, dt * 12f));
            Vector3 nextPos = mainCamera.transform.position + fpsVelocity * dt;
            nextPos.y = Mathf.Clamp(nextPos.y, 0.85f, 14f);
            mainCamera.transform.position = nextPos;
        }

        private void UpdateOrbitMovement()
        {
            Vector2 mousePos = GetMousePosition();
            if (mousePos.y > Screen.height - 75f) return; // Evitar arrastrar sobre el menu superior

            if (IsMouseButtonPressed(0))
            {
                Vector2 delta = GetMouseDelta();
                orbitYaw += delta.x * 0.22f;
                orbitPitch = Mathf.Clamp(orbitPitch - delta.y * 0.22f, 10f, 85f);
            }
            else if (IsMouseButtonPressed(1))
            {
                Vector2 delta = GetMouseDelta();
                Vector3 right = mainCamera.transform.right;
                Vector3 forward = Vector3.ProjectOnPlane(mainCamera.transform.forward, Vector3.up).normalized;
                orbitTarget -= (right * delta.x + forward * delta.y) * 0.025f;
            }

            float scroll = GetMouseScrollY();
            if (Mathf.Abs(scroll) > 0.001f)
            {
                orbitDistance = Mathf.Clamp(orbitDistance - scroll * 1.6f, 2.5f, 42f);
            }

            Quaternion rot = Quaternion.Euler(orbitPitch, orbitYaw, 0f);
            Vector3 pos = orbitTarget + rot * new Vector3(0f, 0f, -orbitDistance);
            mainCamera.transform.position = pos;
            mainCamera.transform.LookAt(orbitTarget);
        }

        private void UpdateRaycastInteraction()
        {
            if (mainCamera == null) return;

            Vector2 mousePos = GetMousePosition();
            // Ignorar clics en la barra superior o en el inspector derecho
            if (mousePos.y > Screen.height - 75f) return;
            if (!string.IsNullOrEmpty(activeInspectedKey) && mousePos.x > Screen.width - 360f && mousePos.y > Screen.height - 460f) return;

            Ray ray = (isFpsMode && Cursor.lockState == CursorLockMode.Locked)
                ? mainCamera.ViewportPointToRay(new Vector3(0.5f, 0.5f, 0f))
                : mainCamera.ScreenPointToRay(mousePos);

            hoveredKey = "";
            if (Physics.Raycast(ray, out RaycastHit hit, 35f))
            {
                var tag = hit.collider.GetComponentInParent<UNABInteractableTag>();
                if (tag != null)
                {
                    hoveredKey = tag.dataKey;
                }
            }

            if (WasMouseButtonPressedThisFrame(0))
            {
                if (isFpsMode && Cursor.lockState != CursorLockMode.Locked)
                {
                    Cursor.lockState = CursorLockMode.Locked;
                    Cursor.visible = false;
                    return;
                }

                if (!string.IsNullOrEmpty(hoveredKey))
                {
                    activeInspectedKey = hoveredKey;
                }
            }
        }

        private void UpdateAnimations(float dt)
        {
            // Animacion de puertas
            foreach (var d in doorHinges)
            {
                if (d.pivot == null) continue;
                float targetY = doorsOpen ? d.openAngleY : d.closedAngleY;
                Vector3 euler = d.pivot.localEulerAngles;
                float currentY = Mathf.LerpAngle(euler.y, targetY, dt * 6f);
                d.pivot.localEulerAngles = new Vector3(0f, currentY, 0f);
            }

            // Animacion de paquetes de datos por los cables Cat6A
            if (packetsEnabled)
            {
                foreach (var r in packetRoutes)
                {
                    if (r.packetMesh == null || r.waypoints == null || r.waypoints.Length < 2) continue;
                    r.progress = (r.progress + dt * r.speed) % 1f;
                    r.packetMesh.position = EvaluatePolyline(r.waypoints, r.progress);
                }
            }
        }

        public static Vector3 EvaluatePolyline(Vector3[] pts, float t)
        {
            float totalLen = 0f;
            for (int i = 0; i < pts.Length - 1; i++)
                totalLen += Vector3.Distance(pts[i], pts[i + 1]);

            float targetDist = t * totalLen;
            float accum = 0f;
            for (int i = 0; i < pts.Length - 1; i++)
            {
                float seg = Vector3.Distance(pts[i], pts[i + 1]);
                if (accum + seg >= targetDist && seg > 0.0001f)
                {
                    float localT = (targetDist - accum) / seg;
                    return Vector3.Lerp(pts[i], pts[i + 1], localT);
                }
                accum += seg;
            }
            return pts[pts.Length - 1];
        }

        // ============================================================================
        // COMPATIBILIDAD DUAL INPUT SYSTEM (NEW INPUT SYSTEM & LEGACY INPUT MANAGER)
        // ============================================================================
        public static bool IsKeyPressed(KeyCode key)
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current != null)
            {
                switch (key)
                {
                    case KeyCode.W: return Keyboard.current.wKey.isPressed;
                    case KeyCode.A: return Keyboard.current.aKey.isPressed;
                    case KeyCode.S: return Keyboard.current.sKey.isPressed;
                    case KeyCode.D: return Keyboard.current.dKey.isPressed;
                    case KeyCode.UpArrow: return Keyboard.current.upArrowKey.isPressed;
                    case KeyCode.DownArrow: return Keyboard.current.downArrowKey.isPressed;
                    case KeyCode.LeftArrow: return Keyboard.current.leftArrowKey.isPressed;
                    case KeyCode.RightArrow: return Keyboard.current.rightArrowKey.isPressed;
                    case KeyCode.Space: return Keyboard.current.spaceKey.isPressed;
                    case KeyCode.LeftShift: return Keyboard.current.leftShiftKey.isPressed;
                    case KeyCode.RightShift: return Keyboard.current.rightShiftKey.isPressed;
                }
            }
            return false;
#else
            return Input.GetKey(key);
#endif
        }

        public static bool WasKeyPressedThisFrame(KeyCode key)
        {
#if ENABLE_INPUT_SYSTEM
            if (Keyboard.current != null)
            {
                switch (key)
                {
                    case KeyCode.E: return Keyboard.current.eKey.wasPressedThisFrame;
                    case KeyCode.F: return Keyboard.current.fKey.wasPressedThisFrame;
                    case KeyCode.T: return Keyboard.current.tKey.wasPressedThisFrame;
                    case KeyCode.C: return Keyboard.current.cKey.wasPressedThisFrame;
                    case KeyCode.M: return Keyboard.current.mKey.wasPressedThisFrame;
                    case KeyCode.L: return Keyboard.current.lKey.wasPressedThisFrame;
                    case KeyCode.Escape: return Keyboard.current.escapeKey.wasPressedThisFrame;
                }
            }
            return false;
#else
            return Input.GetKeyDown(key);
#endif
        }

        public static Vector2 GetMouseDelta()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null ? Mouse.current.delta.ReadValue() : Vector2.zero;
#else
            return new Vector2(Input.GetAxisRaw("Mouse X") * 10f, Input.GetAxisRaw("Mouse Y") * 10f);
#endif
        }

        public static Vector2 GetMousePosition()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null ? Mouse.current.position.ReadValue() : Vector2.zero;
#else
            return Input.mousePosition;
#endif
        }

        public static bool IsMouseButtonPressed(int button)
        {
#if ENABLE_INPUT_SYSTEM
            if (Mouse.current == null) return false;
            return button == 0 ? Mouse.current.leftButton.isPressed : Mouse.current.rightButton.isPressed;
#else
            return Input.GetMouseButton(button);
#endif
        }

        public static bool WasMouseButtonPressedThisFrame(int button)
        {
#if ENABLE_INPUT_SYSTEM
            if (Mouse.current == null) return false;
            return button == 0 ? Mouse.current.leftButton.wasPressedThisFrame : Mouse.current.rightButton.wasPressedThisFrame;
#else
            return Input.GetMouseButtonDown(button);
#endif
        }

        public static float GetMouseScrollY()
        {
#if ENABLE_INPUT_SYSTEM
            return Mouse.current != null ? Mouse.current.scroll.ReadValue().y * 0.01f : 0f;
#else
            return Input.mouseScrollDelta.y;
#endif
        }
    }
}
