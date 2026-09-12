"""Exercise release sequencing without a Docker daemon or a deployment host."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
REVISION = "a" * 40


class ReleaseScriptsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.bin = self.root / "bin"
        self.bin.mkdir()
        for name in ("build.sh", "deploy.sh", "media-preview.ref"):
            shutil.copy2(ROOT / name, self.root / name)
        self.original_env = "JWT_SECRET=test-only\nSYNC_SIGNING_KEY=test-only\nKOLLAB_RELEASE=previous\n"
        (self.root / ".env").write_text(self.original_env)
        self.log = self.root / "commands.jsonl"
        self.env = {**os.environ, "PATH": f"{self.bin}:{os.environ['PATH']}",
                    "RELEASE_TEST_LOG": str(self.log)}
        self.write_executable("git", f"#!/bin/sh\necho {REVISION}\n")
        self.write_executable("sleep", "#!/bin/sh\nexit 0\n")
        self.write_executable("docker", """#!/usr/bin/env python3
import json, os, sys
args = sys.argv[1:]
with open(os.environ['RELEASE_TEST_LOG'], 'a') as log:
    log.write(json.dumps(args) + '\\n')
if args == ['buildx', 'version'] and os.environ.get('NO_BUILDX_PLUGIN'):
    sys.exit(1)
if args == ['compose', 'pull'] and os.environ.get('FAIL_PULL'):
    sys.exit(1)
if args[:2] == ['compose', 'ps'] and not os.environ.get('NO_REPLICAS'):
    print('api-one\\napi-two')
if args[:2] == ['exec', 'api-two'] and os.environ.get('FAIL_SECOND_REPLICA'):
    sys.exit(1)
""")

    def write_executable(self, name, content):
        path = self.bin / name
        path.write_text(content)
        path.chmod(0o755)

    def run_script(self, name, *args, **env):
        return subprocess.run(["bash", str(self.root / name), *args], env={**self.env, **env},
                              capture_output=True, text=True, timeout=30)

    def commands(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()]

    def test_deployment_pulls_before_replacement_and_checks_both_replicas(self):
        result = self.run_script("deploy.sh")
        self.assertEqual(result.returncode, 0, result.stderr)
        commands = self.commands()
        self.assertLess(commands.index(["compose", "pull"]),
                        commands.index(["compose", "up", "-d", "--no-build", "--pull", "never"]))
        self.assertFalse(any("build" in command for command in commands))
        self.assertEqual({command[1] for command in commands if command[0] == "exec"},
                         {"api-one", "api-two"})
        self.assertEqual((self.root / ".env").read_text().count("KOLLAB_RELEASE="), 1)
        self.assertIn(f"KOLLAB_RELEASE={REVISION}", (self.root / ".env").read_text())

    def test_failed_download_preserves_release_selection_and_running_containers(self):
        result = self.run_script("deploy.sh", FAIL_PULL="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.root / ".env").read_text(), self.original_env)
        self.assertFalse(any(command[:2] == ["compose", "up"] for command in self.commands()))

    def test_unhealthy_second_replica_fails_release(self):
        result = self.run_script("deploy.sh", FAIL_SECOND_REPLICA="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("API replica failed its health check: api-two", result.stderr)

    def test_missing_replicas_fail_release(self):
        result = self.run_script("deploy.sh", NO_REPLICAS="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("No running API replicas", result.stderr)

    def test_local_build_targets_server_and_loads_all_images_without_publishing(self):
        result = self.run_script("build.sh")
        self.assertEqual(result.returncode, 0, result.stderr)
        builds = [command for command in self.commands() if command[:2] == ["buildx", "build"]]
        self.assertEqual(len(builds), 3)
        for build in builds:
            self.assertIn("linux/amd64", build)
            self.assertIn("--load", build)
            self.assertNotIn("--push", build)
        self.assertTrue(builds[-1][-1].endswith((self.root / "media-preview.ref").read_text().strip()))

    def test_local_build_supports_native_arm_and_custom_tag(self):
        result = self.run_script("build.sh", "--platform", "linux/arm64", "--tag", "review")
        self.assertEqual(result.returncode, 0, result.stderr)
        builds = [command for command in self.commands() if command[:2] == ["buildx", "build"]]
        for build in builds:
            self.assertIn("linux/arm64", build)
            self.assertTrue(build[build.index("--tag") + 1].endswith(":review"))

    def test_local_build_supports_homebrew_standalone_buildx(self):
        self.write_executable("docker-buildx", '#!/bin/sh\nexec docker buildx "$@"\n')
        result = self.run_script("build.sh", NO_BUILDX_PLUGIN="1")
        self.assertEqual(result.returncode, 0, result.stderr)
        builds = [command for command in self.commands() if command[:2] == ["buildx", "build"]]
        self.assertEqual(len(builds), 3)

    def test_local_build_rejects_invalid_options_before_docker(self):
        for args in (("--tag",), ("--platform", "windows/amd64"), ("--tag", "bad/tag")):
            with self.subTest(args=args):
                self.assertNotEqual(self.run_script("build.sh", *args).returncode, 0)
        self.assertFalse(self.log.exists())


if __name__ == "__main__":
    unittest.main()
