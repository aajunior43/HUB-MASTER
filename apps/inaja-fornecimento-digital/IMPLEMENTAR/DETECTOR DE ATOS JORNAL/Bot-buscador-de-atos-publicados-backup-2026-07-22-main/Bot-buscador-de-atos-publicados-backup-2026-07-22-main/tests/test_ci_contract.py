from __future__ import annotations

import re
import tomllib
from pathlib import Path

import pytest

REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
CI_WORKFLOW = REPOSITORY_ROOT / ".github" / "workflows" / "ci.yml"
PUBLISH_WORKFLOW = REPOSITORY_ROOT / ".github" / "workflows" / "docker-publish.yml"
PRODUCTION_COMPOSE = REPOSITORY_ROOT / "docker-compose.yml"
DEVELOPMENT_COMPOSE = REPOSITORY_ROOT / "docker-compose.dev.yml"
DOCKERFILE = REPOSITORY_ROOT / "Dockerfile"


def _package_names(requirements: list[str]) -> set[str]:
    return {
        re.match(r"[A-Za-z0-9_.-]+", requirement).group(0).lower().replace("_", "-")
        for requirement in requirements
        if re.match(r"[A-Za-z0-9_.-]+", requirement)
    }


def _requirements_names(requirements_text: str) -> set[str]:
    return _package_names([line.strip() for line in requirements_text.splitlines() if line.strip()])


def _assert_dependency_contract(pyproject_text: str, requirements_text: str) -> None:
    project = tomllib.loads(pyproject_text)["project"]
    declared = _package_names([*project["dependencies"], *project["optional-dependencies"]["dev"]])
    exported = _requirements_names(requirements_text)
    assert declared == exported, (
        "requirements.txt must be a compatibility export of pyproject.toml; "
        f"missing from pyproject={sorted(exported - declared)}, "
        f"missing from requirements={sorted(declared - exported)}"
    )


def _assert_ruff_contract(workflow_text: str) -> None:
    assert "continue-on-error:" not in workflow_text, "Ruff must not be allowed to soft-fail"
    assert "ruff check ." in workflow_text, "CI must run ruff check"
    assert "ruff format --check ." in workflow_text, "CI must verify Ruff formatting"


def _assert_packaged_module(pyproject_text: str, module_name: str) -> None:
    packaged_modules = tomllib.loads(pyproject_text)["tool"]["setuptools"]["py-modules"]
    assert module_name in packaged_modules, (
        f"{module_name}.py is imported at runtime and must be included in the installed package"
    )


def test_dependency_export_matches_pyproject_declarations() -> None:
    # Given: the repository's package metadata and compatibility export.
    pyproject_text = (REPOSITORY_ROOT / "pyproject.toml").read_text(encoding="utf-8")
    requirements_text = (REPOSITORY_ROOT / "requirements.txt").read_text(encoding="utf-8")

    # When: delivery dependencies are compared by distribution name.
    # Then: no runtime or development dependency may drift between declarations.
    _assert_dependency_contract(pyproject_text, requirements_text)


def test_dependency_validator_rejects_a_missing_runtime_dependency(tmp_path: Path) -> None:
    # Given: an otherwise valid temporary package declaration.
    pyproject_path = tmp_path / "pyproject.toml"
    pyproject_path.write_text(
        '[project]\ndependencies = ["pypdf>=5.0.0"]\n\n[project.optional-dependencies]\ndev = []\n',
        encoding="utf-8",
    )

    # When: its compatibility export omits the runtime dependency.
    # Then: the contract validator rejects the drift.
    with pytest.raises(AssertionError, match="missing from requirements"):
        _assert_dependency_contract(pyproject_path.read_text(encoding="utf-8"), "")


def test_form_parser_is_declared_as_a_runtime_dependency() -> None:
    # Given: FastAPI routes that use Form parameters at application startup.
    project = tomllib.loads((REPOSITORY_ROOT / "pyproject.toml").read_text(encoding="utf-8"))[
        "project"
    ]

    # When: runtime dependency declarations are inspected.
    # Then: the multipart parser is installed without requiring development extras.
    assert "python-multipart" in _package_names(project["dependencies"])


def test_runtime_webhook_security_module_is_packaged() -> None:
    # Given: a runtime module imported by notifier and webapp.
    pyproject_text = (REPOSITORY_ROOT / "pyproject.toml").read_text(encoding="utf-8")

    # When: setuptools package contents are inspected.
    # Then: installed deployments include the security validation module.
    _assert_packaged_module(pyproject_text, "webhook_security")


def test_ci_runs_blocking_ruff_check_and_format() -> None:
    # Given: the checked-in CI workflow.
    workflow_text = CI_WORKFLOW.read_text(encoding="utf-8")

    # When: its quality gate is inspected.
    # Then: lint and formatting failures block CI.
    _assert_ruff_contract(workflow_text)


def test_ruff_validator_rejects_a_soft_fail_workflow(tmp_path: Path) -> None:
    # Given: a temporary workflow with complete Ruff commands.
    workflow_path = tmp_path / "ci.yml"
    workflow_path.write_text(
        "continue-on-error: true\nruff check .\nruff format --check .\n",
        encoding="utf-8",
    )

    # When: the workflow makes the quality gate non-blocking.
    # Then: the contract validator rejects it.
    with pytest.raises(AssertionError, match="soft-fail"):
        _assert_ruff_contract(workflow_path.read_text(encoding="utf-8"))


def test_dockerfile_and_ci_share_the_python_312_baseline() -> None:
    # Given: the container and CI delivery definitions.
    dockerfile_text = DOCKERFILE.read_text(encoding="utf-8")
    workflow_text = CI_WORKFLOW.read_text(encoding="utf-8")

    # When: their Python baselines are checked.
    # Then: both use the supported Python 3.12 baseline.
    assert "FROM python:3.12" in dockerfile_text
    assert 'python-version: "3.12"' in workflow_text


def test_publish_is_a_ci_job_after_tests_not_an_independent_workflow() -> None:
    # Given: the CI workflow and the legacy standalone publish-workflow path.
    workflow_text = CI_WORKFLOW.read_text(encoding="utf-8")

    # When: image publication ownership is checked.
    # Then: it is gated by successful tests on main and has no independent workflow.
    assert "build-and-push:" in workflow_text
    assert "needs: test" in workflow_text
    assert "github.ref == 'refs/heads/main'" in workflow_text
    assert not PUBLISH_WORKFLOW.exists(), (
        "publish must be gated inside ci.yml, not separately triggered"
    )


def test_production_compose_does_not_mount_source_or_enable_reload() -> None:
    # Given: the production compose definition.
    compose_text = PRODUCTION_COMPOSE.read_text(encoding="utf-8")

    # When: its runtime isolation is checked.
    # Then: production runs the built image without a source bind mount or reload mode.
    assert "./:/workspace" not in compose_text
    assert "--reload" not in compose_text


def test_development_compose_override_provides_source_mount_and_reload() -> None:
    # Given: the required development compose override path.
    # When: its local-development behavior is checked.
    # Then: it restores a source mount and reload without weakening production compose.
    assert DEVELOPMENT_COMPOSE.exists(), (
        "docker-compose.dev.yml must define the development override"
    )
    compose_text = DEVELOPMENT_COMPOSE.read_text(encoding="utf-8")
    assert "./:/workspace" in compose_text
    assert "--reload" in compose_text
