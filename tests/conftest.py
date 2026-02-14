"""
Conftest for alloy tests: shared fixtures and configuration.
"""

import pytest
import pandapower as pp
import pandapower.networks as pn


@pytest.fixture
def case6ww_network():
    """Fixture providing a prepared case6ww network."""
    net = pn.case6ww()
    pp.runpp(net)
    return net


@pytest.fixture
def case14_network():
    """Fixture providing a prepared case14 network."""
    net = pn.case14()
    pp.runpp(net)
    return net
