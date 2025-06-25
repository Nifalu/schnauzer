from setuptools import setup, find_packages

with open("README.md") as f:
    description = f.read()

setup(
    name="schnauzer",
    version="0.2.2",
    description="Visualize networkx graphs interactively in a web browser.",
    author="Nico Bachmann",
    author_email="python@deschnauz.ch",
    packages=find_packages(),
    include_package_data=True,
    package_data={
        "schnauzer": ["static/**/*", "templates/**/*"],
    },
    install_requires=[
        "flask",
        "flask-socketio",
        "pyzmq",
        "networkx",
        "pyyaml",
    ],
    entry_points={
        "console_scripts": [
            "schnauzer-server=schnauzer.server:main",
        ],
    },
    python_requires=">=3.10",
    long_description=description,
    long_description_content_type="text/markdown",
)
