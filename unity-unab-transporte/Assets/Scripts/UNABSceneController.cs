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
        public List<Renderer> blinkingLedRenderers = new List<Renderer>();

        [Header("3D Walking Person (Avatar UNAB)")]
        public Transform playerRoot;
        public Transform playerVisuals;
        public Transform playerHead;
        public Transform playerLeftArmPivot;
        public Transform playerRightArmPivot;
        public Transform playerLeftLegPivot;
        public Transform playerRightLegPivot;
        public bool isThirdPerson = true;

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

        // Player & Walk Camera state (Inicia en el exterior frente al Portico Principal de la UNAB mirando hacia el campus)
        private float yaw = -90f;
        private float pitch = 8f;
        private float targetYaw = -90f;
        private float targetPitch = 8f;
        private Vector3 playerVelocity = Vector3.zero;
        private float walkCycle = 0f;
        private float thirdPersonDist = 2.2f;

        // Orbit Camera state
        private Vector3 orbitTarget = new Vector3(0f, 0.9f, 0f);
        private float orbitDistance = 22f;
        private float orbitYaw = 15f;
        private float orbitPitch = 42f;

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
            if (playerRoot != null && playerRoot.position.x > 15f)
            {
                yaw = targetYaw = -90f;
                pitch = targetPitch = 6f;
            }
            if (playerVisuals != null)
            {
                playerVisuals.rotation = Quaternion.Euler(0f, yaw, 0f);
            }
            ActivateFpsMode();
        }

        public bool IsPlayerOutsideCampus()
        {
            if (playerRoot == null) return false;
            return playerRoot.position.x > 8.2f || Mathf.Abs(playerRoot.position.z) > 5.8f;
        }

        public void TeleportPlayerTo(Vector3 pos, float lookYaw, float lookPitch = 8f)
        {
            isConsoleOpen = false;
            transitioning = false;
            isFpsMode = true;
            SetCeilingState(true);

            if (playerRoot != null)
            {
                playerRoot.position = new Vector3(pos.x, 0f, pos.z);
            }
            playerVelocity = Vector3.zero;
            yaw = targetYaw = lookYaw;
            pitch = targetPitch = lookPitch;
            if (playerVisuals != null)
            {
                playerVisuals.rotation = Quaternion.Euler(0f, yaw, 0f);
            }
            UpdateAvatarVisibility();
            LockMouseCursor();
        }

        public void ToggleExteriorInteriorWalk()
        {
            if (IsPlayerOutsideCampus())
            {
                // Teletransportar al interior (Oficina de Monitoreo / Area de Transporte)
                TeleportPlayerTo(new Vector3(2.2f, 0f, -0.4f), 0f, 12f);
            }
            else
            {
                // Teletransportar al exterior frente al Gran Portico Principal de la UNAB y Mural de Caral
                TeleportPlayerTo(new Vector3(36.5f, 0f, 3.5f), -90f, 6f);
            }
        }

        public void ActivateFpsMode()
        {
            isConsoleOpen = false;
            transitioning = false;
            isFpsMode = true;
            SetCeilingState(true);

            if (playerRoot != null)
            {
                Vector3 p = playerRoot.position;
                p.y = 0f;
                playerRoot.position = p;
            }
            else if (mainCamera != null)
            {
                mainCamera.transform.position = new Vector3(2.2f, 1.7f, -0.4f);
            }

            UpdateAvatarVisibility();
            LockMouseCursor();
        }

        public void ToggleThirdPerson()
        {
            isThirdPerson = !isThirdPerson;
            if (!isFpsMode)
            {
                ActivateFpsMode();
            }
            else
            {
                UpdateAvatarVisibility();
            }
        }

        private void UpdateAvatarVisibility()
        {
            if (playerVisuals != null)
            {
                bool showAvatar = !isFpsMode || isThirdPerson;
                playerVisuals.gameObject.SetActive(showAvatar);
            }
        }

        public void LockMouseCursor()
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        public void UnlockMouseCursor()
        {
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }

        public void SwitchToCameraView(string viewName)
        {
            isFpsMode = false;
            UnlockMouseCursor();
            SetCeilingState(viewName == "fachada");
            UpdateAvatarVisibility();

            Vector3 endPos = new Vector3(0f, 16.5f, -15.5f);
            Vector3 endLook = new Vector3(0f, 0.8f, 0f);

            if (viewName == "fachada")
            {
                endPos = new Vector3(48.0f, 11.5f, 14.0f);
                endLook = new Vector3(22.0f, 5.2f, 6.0f);
            }
            else if (viewName == "datacenter")
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
                UpdatePlayerAndWalkCamera(dt);
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
                    if (isFpsMode) LockMouseCursor();
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
                    if (isFpsMode) LockMouseCursor();
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

            if (WasKeyPressedThisFrame(KeyCode.V)) ToggleThirdPerson();
            if (WasKeyPressedThisFrame(KeyCode.T)) ToggleCeiling();
            if (WasKeyPressedThisFrame(KeyCode.C)) TogglePackets();
            if (WasKeyPressedThisFrame(KeyCode.M)) ToggleWalls();
            if (WasKeyPressedThisFrame(KeyCode.L)) ToggleLabels();
        }

        public void OpenDeviceConsole()
        {
            if (string.IsNullOrEmpty(activeInspectedKey) || activeInspectedKey == "structured_cabling") return;
            isConsoleOpen = true;
            UnlockMouseCursor();
            if (UNABHudAndConsoleUI.Instance != null)
            {
                UNABHudAndConsoleUI.Instance.OnOpenConsoleForKey(activeInspectedKey);
            }
        }

        private void UpdatePlayerAndWalkCamera(float dt)
        {
            float moveZ = (IsKeyPressed(KeyCode.W) || IsKeyPressed(KeyCode.UpArrow) ? 1f : 0f)
                        - (IsKeyPressed(KeyCode.S) || IsKeyPressed(KeyCode.DownArrow) ? 1f : 0f);
            float moveX = (IsKeyPressed(KeyCode.D) || IsKeyPressed(KeyCode.RightArrow) ? 1f : 0f)
                        - (IsKeyPressed(KeyCode.A) || IsKeyPressed(KeyCode.LeftArrow) ? 1f : 0f);

            // Auto-capturar cursor al presionar WASD
            if ((Mathf.Abs(moveZ) > 0.01f || Mathf.Abs(moveX) > 0.01f) && Cursor.lockState != CursorLockMode.Locked)
            {
                LockMouseCursor();
            }

            // Rotar camara con el raton
            bool canRotate = (Cursor.lockState == CursorLockMode.Locked) || IsMouseButtonPressed(0) || IsMouseButtonPressed(1);
            if (canRotate)
            {
                Vector2 mouseDelta = GetMouseDelta();
                float dx = Mathf.Clamp(mouseDelta.x, -50f, 50f);
                float dy = Mathf.Clamp(mouseDelta.y, -50f, 50f);
                targetYaw += dx * 0.18f;
                float minP = isThirdPerson ? -20f : -75f;
                float maxP = isThirdPerson ? 55f : 75f;
                targetPitch = Mathf.Clamp(targetPitch - dy * 0.18f, minP, maxP);
            }

            float scroll = GetMouseScrollY();
            if (isThirdPerson && Mathf.Abs(scroll) > 0.001f)
            {
                thirdPersonDist = Mathf.Clamp(thirdPersonDist - scroll * 0.35f, 1.0f, 3.6f);
            }

            float smoothLook = Mathf.Min(1f, dt * 20f);
            yaw = Mathf.Lerp(yaw, targetYaw, smoothLook);
            pitch = Mathf.Lerp(pitch, targetPitch, smoothLook);

            Vector3 fwd = Quaternion.Euler(0f, yaw, 0f) * Vector3.forward;
            Vector3 right = Quaternion.Euler(0f, yaw, 0f) * Vector3.right;

            float walkSpeed = (IsKeyPressed(KeyCode.LeftShift) || IsKeyPressed(KeyCode.RightShift)) ? 5.6f : 3.8f;
            Vector3 desiredMove = Vector3.zero;
            if (Mathf.Abs(moveZ) > 0.01f || Mathf.Abs(moveX) > 0.01f)
            {
                desiredMove = (fwd * moveZ + right * moveX).normalized * walkSpeed;
            }

            playerVelocity = Vector3.Lerp(playerVelocity, desiredMove, Mathf.Min(1f, dt * 15f));

            Vector3 currentPos = playerRoot != null ? playerRoot.position : new Vector3(mainCamera.transform.position.x, 0f, mainCamera.transform.position.z);
            Vector3 nextPos = currentPos + playerVelocity * dt;

            // Movimiento 100% libre por toda la avenida exterior, portico UNAB, mural de Caral, patio del campus y oficinas interiores
            nextPos.x = Mathf.Clamp(nextPos.x, -28.0f, 52.0f);
            nextPos.z = Mathf.Clamp(nextPos.z, -56.0f, 58.0f);
            nextPos.y = 0f;

            if (playerRoot != null)
            {
                playerRoot.position = nextPos;
            }

            // Animar el personaje 3D (siempre mirando hacia adelante / direccion de avance, nunca de espaldas)
            float planarSpeed = new Vector2(playerVelocity.x, playerVelocity.z).magnitude;
            AnimatePlayerAvatar(dt, planarSpeed, playerVelocity);

            // Posicionar camara en 3ra Persona o 1ra Persona
            if (isThirdPerson && playerRoot != null)
            {
                Quaternion camRot = Quaternion.Euler(pitch, yaw, 0f);
                Vector3 pivotPos = nextPos + new Vector3(0f, 1.54f, 0f) + (camRot * Vector3.right) * 0.20f;
                Vector3 camDir = camRot * Vector3.back;

                mainCamera.transform.position = pivotPos + camDir * thirdPersonDist;
                mainCamera.transform.rotation = camRot;
            }
            else
            {
                mainCamera.transform.position = nextPos + new Vector3(0f, 1.66f, 0f);
                mainCamera.transform.rotation = Quaternion.Euler(pitch, yaw, 0f);
            }
        }

        private void AnimatePlayerAvatar(float dt, float speed, Vector3 velocity)
        {
            if (playerVisuals == null) return;

            if (speed > 0.12f)
            {
                // Al caminar: el personaje mira hacia donde avanza
                float moveYaw = Mathf.Atan2(velocity.x, velocity.z) * Mathf.Rad2Deg;
                Quaternion targetRot = Quaternion.Euler(0f, moveYaw, 0f);
                playerVisuals.rotation = Quaternion.Slerp(playerVisuals.rotation, targetRot, dt * 14f);

                walkCycle += dt * speed * 3.2f;
                float swing = Mathf.Sin(walkCycle);
                float bob = Mathf.Abs(Mathf.Cos(walkCycle)) * 0.03f;

                playerVisuals.localPosition = new Vector3(0f, bob, 0f);

                if (playerLeftLegPivot != null) playerLeftLegPivot.localRotation = Quaternion.Euler(swing * 34f, 0f, 0f);
                if (playerRightLegPivot != null) playerRightLegPivot.localRotation = Quaternion.Euler(-swing * 34f, 0f, 0f);
                if (playerLeftArmPivot != null) playerLeftArmPivot.localRotation = Quaternion.Euler(-swing * 26f, 0f, 0f);
                if (playerRightArmPivot != null) playerRightArmPivot.localRotation = Quaternion.Euler(swing * 26f, 0f, 0f);
            }
            else
            {
                // Al estar detenido: el personaje gira suavemente mirando hacia donde apunta la camara (de espaldas a la camara)
                Quaternion lookRot = Quaternion.Euler(0f, yaw, 0f);
                playerVisuals.rotation = Quaternion.Slerp(playerVisuals.rotation, lookRot, dt * 8f);

                float idleBreath = Mathf.Sin(Time.time * 2.2f) * 0.007f;
                playerVisuals.localPosition = Vector3.Lerp(playerVisuals.localPosition, new Vector3(0f, idleBreath, 0f), dt * 8f);

                if (playerLeftLegPivot != null) playerLeftLegPivot.localRotation = Quaternion.Slerp(playerLeftLegPivot.localRotation, Quaternion.identity, dt * 10f);
                if (playerRightLegPivot != null) playerRightLegPivot.localRotation = Quaternion.Slerp(playerRightLegPivot.localRotation, Quaternion.identity, dt * 10f);
                if (playerLeftArmPivot != null) playerLeftArmPivot.localRotation = Quaternion.Slerp(playerLeftArmPivot.localRotation, Quaternion.Euler(0f, 0f, 3f), dt * 10f);
                if (playerRightArmPivot != null) playerRightArmPivot.localRotation = Quaternion.Slerp(playerRightArmPivot.localRotation, Quaternion.Euler(0f, 0f, -3f), dt * 10f);
            }

            Animator customAnim = playerVisuals.GetComponentInChildren<Animator>();
            if (customAnim != null && customAnim.runtimeAnimatorController != null)
            {
                foreach (var param in customAnim.parameters)
                {
                    if (param.name == "Speed" && param.type == AnimatorControllerParameterType.Float)
                        customAnim.SetFloat("Speed", speed);
                    else if (param.name == "IsWalking" && param.type == AnimatorControllerParameterType.Bool)
                        customAnim.SetBool("IsWalking", speed > 0.12f);
                }
            }
        }

        private void UpdateOrbitMovement()
        {
            Vector2 mousePos = GetMousePosition();
            if (mousePos.y > Screen.height - 65f) return;

            if (IsMouseButtonPressed(0))
            {
                Vector2 delta = GetMouseDelta();
                orbitYaw += delta.x * 0.25f;
                orbitPitch = Mathf.Clamp(orbitPitch - delta.y * 0.25f, 10f, 85f);
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
                orbitDistance = Mathf.Clamp(orbitDistance - scroll * 2.2f, 2.5f, 120f);
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
            if (mousePos.y > Screen.height - 65f) return;

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
                    LockMouseCursor();
                }

                if (!string.IsNullOrEmpty(hoveredKey))
                {
                    activeInspectedKey = hoveredKey;
                }
            }
        }

        private void UpdateAnimations(float dt)
        {
            foreach (var d in doorHinges)
            {
                if (d.pivot == null) continue;
                float targetY = doorsOpen ? d.openAngleY : d.closedAngleY;
                Vector3 euler = d.pivot.localEulerAngles;
                float currentY = Mathf.LerpAngle(euler.y, targetY, dt * 6f);
                d.pivot.localEulerAngles = new Vector3(0f, currentY, 0f);
            }

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
            float[] segLens = new float[pts.Length - 1];
            for (int i = 0; i < pts.Length - 1; i++)
            {
                segLens[i] = Vector3.Distance(pts[i], pts[i + 1]);
                totalLen += segLens[i];
            }
            float target = t * totalLen;
            float acc = 0f;
            for (int i = 0; i < segLens.Length; i++)
            {
                if (acc + segLens[i] >= target)
                {
                    float localT = (target - acc) / Mathf.Max(0.0001f, segLens[i]);
                    return Vector3.Lerp(pts[i], pts[i + 1], localT);
                }
                acc += segLens[i];
            }
            return pts[pts.Length - 1];
        }

        private bool IsKeyPressed(KeyCode key)
        {
#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            if (kb == null) return false;
            switch (key)
            {
                case KeyCode.W: return kb.wKey.isPressed;
                case KeyCode.A: return kb.aKey.isPressed;
                case KeyCode.S: return kb.sKey.isPressed;
                case KeyCode.D: return kb.dKey.isPressed;
                case KeyCode.UpArrow: return kb.upArrowKey.isPressed;
                case KeyCode.DownArrow: return kb.downArrowKey.isPressed;
                case KeyCode.LeftArrow: return kb.leftArrowKey.isPressed;
                case KeyCode.RightArrow: return kb.rightArrowKey.isPressed;
                case KeyCode.Space: return kb.spaceKey.isPressed;
                case KeyCode.LeftShift: return kb.leftShiftKey.isPressed;
                case KeyCode.RightShift: return kb.rightShiftKey.isPressed;
            }
            return false;
#else
            return Input.GetKey(key);
#endif
        }

        private bool WasKeyPressedThisFrame(KeyCode key)
        {
#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            if (kb == null) return false;
            switch (key)
            {
                case KeyCode.E: return kb.eKey.wasPressedThisFrame;
                case KeyCode.F: return kb.fKey.wasPressedThisFrame;
                case KeyCode.V: return kb.vKey.wasPressedThisFrame;
                case KeyCode.T: return kb.tKey.wasPressedThisFrame;
                case KeyCode.C: return kb.cKey.wasPressedThisFrame;
                case KeyCode.M: return kb.mKey.wasPressedThisFrame;
                case KeyCode.L: return kb.lKey.wasPressedThisFrame;
                case KeyCode.Escape: return kb.escapeKey.wasPressedThisFrame;
            }
            return false;
#else
            return Input.GetKeyDown(key);
#endif
        }

        private bool IsMouseButtonPressed(int button)
        {
#if ENABLE_INPUT_SYSTEM
            var m = Mouse.current;
            if (m == null) return false;
            return button == 0 ? m.leftButton.isPressed : m.rightButton.isPressed;
#else
            return Input.GetMouseButton(button);
#endif
        }

        private bool WasMouseButtonPressedThisFrame(int button)
        {
#if ENABLE_INPUT_SYSTEM
            var m = Mouse.current;
            if (m == null) return false;
            return button == 0 ? m.leftButton.wasPressedThisFrame : m.rightButton.wasPressedThisFrame;
#else
            return Input.GetMouseButtonDown(button);
#endif
        }

        private Vector2 GetMouseDelta()
        {
#if ENABLE_INPUT_SYSTEM
            var m = Mouse.current;
            return m != null ? m.delta.ReadValue() : Vector2.zero;
#else
            return new Vector2(Input.GetAxisRaw("Mouse X") * 10f, Input.GetAxisRaw("Mouse Y") * 10f);
#endif
        }

        private Vector2 GetMousePosition()
        {
#if ENABLE_INPUT_SYSTEM
            var m = Mouse.current;
            return m != null ? m.position.ReadValue() : Vector2.zero;
#else
            return Input.mousePosition;
#endif
        }

        private float GetMouseScrollY()
        {
#if ENABLE_INPUT_SYSTEM
            var m = Mouse.current;
            return m != null ? m.scroll.ReadValue().y * 0.01f : 0f;
#else
            return Input.mouseScrollDelta.y;
#endif
        }
    }
}
