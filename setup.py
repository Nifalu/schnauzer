from setuptools import setup, find_packages

setup(
    name="schnauzer",
    version="0.1.0",
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
)