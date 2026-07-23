import zipfile

import pytest

from server import file_ops


@pytest.fixture
def workspace(tmp_path, monkeypatch):
    path = tmp_path / "workspace"
    path.mkdir()
    monkeypatch.setattr(file_ops, "WORKSPACE_DIR", str(path))
    monkeypatch.setattr(file_ops, "SNAPSHOT_DIR", str(tmp_path / "snapshots"))
    return path


def test_write_file_stays_within_workspace(workspace):
    written = file_ops.write_file("nested/example.txt", "hello")

    assert written == str(workspace / "nested" / "example.txt")
    assert (workspace / "nested" / "example.txt").read_text() == "hello"


@pytest.mark.parametrize("path", ["../outside.txt", "/tmp/outside.txt"])
def test_write_file_rejects_paths_outside_workspace(workspace, path):
    with pytest.raises(ValueError, match="outside workspace|absolute path"):
        file_ops.write_file(path, "unsafe")


def test_restore_rejects_snapshot_path_traversal(workspace):
    snapshot_dir = workspace.parent / "snapshots"
    snapshot_dir.mkdir()
    with zipfile.ZipFile(snapshot_dir / "workspace_test.zip", "w") as archive:
        archive.writestr("../outside.txt", "unsafe")

    with pytest.raises(ValueError, match="outside workspace"):
        file_ops.restore("test")
